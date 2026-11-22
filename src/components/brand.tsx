import Link from "next/link";
import { ChartNoAxesCombined } from "lucide-react";
export function Brand() {
  return (
    <Link className="brand" href="/">
      <span className="brand-icon">
        <ChartNoAxesCombined size={23} />
      </span>
      <span>
        Finance<span className="font-normal">Flow</span>
      </span>
    </Link>
  );
}
