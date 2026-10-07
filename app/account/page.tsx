import { WalletPanel } from "@/components/WalletPanel";
import { CHAIN_ID, CONTRACT_ADDRESS, RPC_URL } from "@/lib/constants";

export default function Account() {
  const configured = CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000";
  return <section className="doc accountPage"><div className="eyebrow">Account · network & identity</div><h1>A clear signing surface.</h1><p className="lede">Connect only when you need to sign. Reads can remain public; writes always verify the target network before opening the wallet.</p><WalletPanel/><div className="accountGrid"><div className="panel"><div className="eyebrow">Network</div><h3>GenLayer Studionet</h3><div className="technicalGrid"><span>Chain ID <strong>{CHAIN_ID}</strong></span><span>RPC <strong>{RPC_URL}</strong></span><span>Explorer <strong>explorer-studio.genlayer.com</strong></span></div></div><div className="panel"><div className="eyebrow">Contract binding</div><h3>{configured ? "Production address" : "Address required"}</h3><p className="mono">{CONTRACT_ADDRESS}</p>{!configured && <p className="warning">Set NEXT_PUBLIC_ACCORDANT_CONTRACT to the deployed Studionet address before enabling reads and writes.</p>}<p className="muted">Contract changes require a fresh deployment and a fresh source provenance record.</p></div></div></section>;
}
