"""Windows compatibility for genlayer-test Direct Mode's stdin injection.

The runner duplicates stdin onto a temporary file and immediately unlinks it.
Windows keeps that handle open until the VM deactivates, so the upstream unlink
raises before a contract can be deployed. Keep the exact runner behavior but defer
unlinking until its normal cleanup restores stdin.
"""

import os
import tempfile


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
    if os.name == "nt":
        from gltest.direct import loader
        loader._inject_message_to_fd0 = _windows_safe_message_injection
