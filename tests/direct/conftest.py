"""Windows compatibility for genlayer-test Direct Mode's stdin injection.

The runner duplicates stdin onto a temporary file and immediately unlinks it.
Windows keeps that handle open until the VM deactivates, so the upstream unlink
raises before a contract can be deployed. Keep the exact runner behavior but defer
unlinking until its normal cleanup restores stdin.
"""

import os
import sys
import tempfile


def _v0216_import_address():
    from genlayer.py.types import Address
    return Address


def _v0216_import_calldata():
    import importlib
    return importlib.import_module("genlayer.py.calldata")


def _v0216_import_lazy():
    from genlayer.py.types import Lazy
    return Lazy


def _v0216_import_address_u256():
    from genlayer.py.types import Address, u256
    return Address, u256


def _v0216_sync_message_context(*, contract_address=None, sender_address=None, origin_address=None, value=None, chain_id=None):
    import genlayer.gl as gl
    current = gl.message
    gl.message = type(current)(
        contract_address=contract_address if contract_address is not None else current.contract_address,
        sender_address=sender_address if sender_address is not None else current.sender_address,
        origin_address=origin_address if origin_address is not None else current.origin_address,
        value=value if value is not None else current.value,
        chain_id=chain_id if chain_id is not None else current.chain_id,
    )
    raw = gl.message_raw
    if contract_address is not None:
        raw["contract_address"] = contract_address
    if sender_address is not None:
        raw["sender_address"] = sender_address
    if origin_address is not None:
        raw["origin_address"] = origin_address
    if value is not None:
        raw["value"] = value
    if chain_id is not None:
        raw["chain_id"] = chain_id


def _v0216_allocate_contract(contract_cls, vm, *args, **kwargs):
    from genlayer.py.storage import ROOT_SLOT_ID
    from genlayer.py.storage._internal.generate import ORIGINAL_INIT_ATTR, _storage_build

    description = _storage_build(contract_cls, {})
    slot = vm._storage.get_store_slot(ROOT_SLOT_ID)
    instance = description.get(slot, 0)
    init = getattr(description.cls, "__init__", None)
    if init is None:
        init = getattr(contract_cls, "__init__", None)
    if hasattr(init, ORIGINAL_INIT_ATTR):
        init = getattr(init, ORIGINAL_INIT_ATTR)
    if init is not None:
        init(instance, *args, **kwargs)
    return instance


def _windows_safe_message_injection(vm):
    from genlayer.py import calldata
    from genlayer.py.types import Address

    sender_addr = Address(vm.sender) if isinstance(vm.sender, bytes) else vm.sender
    contract_addr = Address(vm._contract_address) if isinstance(vm._contract_address, bytes) else vm._contract_address
    origin_addr = Address(vm.origin) if isinstance(vm.origin, bytes) else vm.origin
    encoded = calldata.encode({
        "contract_address": contract_addr,
        "sender_address": sender_addr,
        "origin_address": origin_addr,
        "stack": [],
        "value": vm._value,
        "datetime": vm._datetime,
        "is_init": False,
        "chain_id": vm._chain_id,
        "entry_kind": 0,
        "entry_data": b"",
        "entry_stage_data": None,
    })
    fd, path = tempfile.mkstemp()
    os.write(fd, encoded)
    os.lseek(fd, 0, os.SEEK_SET)
    vm._original_stdin_fd = os.dup(0)
    os.dup2(fd, 0)
    os.close(fd)
    cleanup = vm._cleanup_after_deactivate

    def cleanup_with_file():
        cleanup()
        try:
            os.unlink(path)
        except FileNotFoundError:
            pass

    vm._cleanup_after_deactivate = cleanup_with_file


def pytest_configure(config):
    from gltest.direct import loader, wasi_mock
    from gltest.direct import sdk_compat, vm as direct_vm
    sdk_compat.import_address = _v0216_import_address
    sdk_compat.import_calldata = _v0216_import_calldata
    wasi_mock.import_calldata = _v0216_import_calldata
    sdk_compat.import_lazy = _v0216_import_lazy
    sdk_compat.import_address_u256 = _v0216_import_address_u256
    sdk_compat.sync_message_context = _v0216_sync_message_context
    loader.import_address = _v0216_import_address
    loader.import_calldata = _v0216_import_calldata
    direct_vm.import_address_u256 = _v0216_import_address_u256
    direct_vm.sync_message_context = _v0216_sync_message_context
    def _refresh_v0216(self):
        if "genlayer" not in sys.modules:
            return
        Address, u256 = _v0216_import_address_u256()
        sender = self.sender
        if isinstance(sender, bytes):
            sender = Address(sender)
        origin = self.origin
        if isinstance(origin, bytes):
            origin = Address(origin)
        _v0216_sync_message_context(sender_address=sender, origin_address=origin, value=u256(self._value), chain_id=u256(self._chain_id))
    direct_vm.VMContext._refresh_gl_message = _refresh_v0216
    original_patch_nondet = loader._patch_run_nondet_for_direct_mode
    def _patch_nondet_v0216():
        original_patch_nondet()
        # v0.2.16 exposes the VM under genlayer.gl.vm, while the pinned
        # loader only patches the newer genlayer.vm import path. Keep the
        # direct-mode behavior identical: execute the leader locally and
        # retain the validator for the harness' captured consensus record.
        from gltest.direct import wasi_mock
        from genlayer.gl import vm as gl_vm

        def _direct_run_nondet(leader_fn, validator_fn, /, **kwargs):
            vm = wasi_mock.get_vm()
            vm._in_nondet = True
            try:
                result = leader_fn()
            finally:
                vm._in_nondet = False
            vm._captured_validators.append((result, leader_fn, validator_fn))
            return result

        gl_vm.run_nondet = _direct_run_nondet
        gl_vm.run_nondet_unsafe = _direct_run_nondet
        sys.modules.setdefault("genlayer.vm", gl_vm)
    loader._patch_run_nondet_for_direct_mode = _patch_nondet_v0216
    try:
        from genlayer.py.storage._internal.generate import _BuilderCtx  # noqa: F401
    except ImportError:
        loader._allocate_contract = _v0216_allocate_contract
    if os.name == "nt":
        loader._inject_message_to_fd0 = _windows_safe_message_injection
