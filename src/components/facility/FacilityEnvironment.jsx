export default function FacilityEnvironment() {
  return (
    <div className="facility" aria-hidden="true">
      <div className="ceiling-light" />
      <div className="ceiling-beam" />
      <div className="server-wall">
        {Array.from({ length: 10 }, (_, rack) => (
          <div className="server-rack" key={rack}>
            {Array.from({ length: 5 }, (_, unit) => (
              <div className="server-unit" key={unit}>
                <div className="tape-reels">
                  <i />
                  <i />
                </div>
                <span className="unit-slot" />
                <div className="unit-lights">
                  <b style={{ animationDelay: `${rack + unit * 0.7}s` }} />
                  <b />
                  <b />
                </div>
              </div>
            ))}
            <div className="rack-vents" />
          </div>
        ))}
      </div>
      <div className="back-wall-glow" />
      <div className="floor-grid" />
      <div className="desk-surface" />
      <div className="scene-vignette" />
      <div className="film-grain" />
    </div>
  );
}
