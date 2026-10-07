export function AgreementBoard() {
  return <div className="agreementBoard" aria-label="Accordant agreement board example">
    <div className="boardHeader"><span className="boardKicker">Agreement board · milestone 01</span><span className="boardStamp">FROZEN</span></div>
    <div className="partyRow">
      <div className="party"><small>Requester</small><strong>Sets the line</strong></div>
      <div className="joinLine" aria-hidden="true" />
      <div className="party"><small>Performer</small><strong>Meets the line</strong></div>
    </div>
    <div className="boardCriteria">
      <div className="miniCriterion"><b>01</b><span>Production page is publicly reachable</span><span className="miniTag">Required</span></div>
      <div className="miniCriterion"><b>02</b><span>Source is linked to a stable version</span><span className="miniTag">Required</span></div>
      <div className="miniCriterion"><b>03</b><span>Supporting artifact is easy to inspect</span><span className="miniTag">Optional</span></div>
    </div>
    <span className="frozenTerms">FROZEN TERMS · BOTH SIDES SIGN</span>
    <div className="evidenceFlow">
      <div className="evidenceCard"><strong>Evidence attached</strong><span>criterion 01 · public artifact</span></div>
      <div className="flowArrow" aria-hidden="true">→</div>
      <div className="reviewCard"><strong>GenLayer review</strong><span>MET · acceptance line crossed</span></div>
    </div>
    <div className="boardFooter"><span>Criterion result</span><span className="outcomeMark">ACCEPTED</span></div>
  </div>;
}
