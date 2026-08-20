import { Link } from "react-router-dom";

const VARIATIONS = [
  { icon: "👥", label: "2-Person", path: "/euchre/2p/setup", soon: false },
  { icon: "🧑‍🤝‍🧑", label: "3-Person", path: "/euchre/3p/setup", soon: false },
  { icon: "♣️", label: "Traditional (2v2)", path: "/euchre/traditional/setup", soon: false },
  { icon: "🃏", label: "15-Card", path: "/euchre/15card/setup", soon: false },
  { icon: "🤝", label: "Pick Your Partner", path: "/euchre/partner/setup", soon: false },
];

export default function EuchreVariationSelect() {
  return (
    <div>
      <h1 className="page-title">
        <span className="suit black">♣</span> Euchre — Select variation
      </h1>
      <div className="game-grid">
        {VARIATIONS.map((v) =>
          v.soon ? (
            <div className="game-tile disabled" key={v.label}>
              <span className="icon">{v.icon}</span>
              <span>{v.label}</span>
              <span className="soon">Coming soon</span>
            </div>
          ) : (
            <Link className="game-tile" to={v.path} key={v.label}>
              <span className="icon">{v.icon}</span>
              <span>{v.label}</span>
            </Link>
          )
        )}
      </div>
    </div>
  );
}
