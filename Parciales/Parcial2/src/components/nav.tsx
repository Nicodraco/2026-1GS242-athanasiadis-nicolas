import { Sprout } from "lucide-react";
import { Link } from "react-router-dom";

interface NavProps {
  right?: React.ReactNode;
}

export function Nav({ right }: NavProps) {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link to="/" className="brand" aria-label="UrbanSprout — inicio">
          <div className="brand-icon">
            <Sprout size={16} />
          </div>
          UrbanSprout
        </Link>
        <div className="nav-actions">{right}</div>
      </div>
    </header>
  );
}
