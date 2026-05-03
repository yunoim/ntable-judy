import { requireApproved } from "@/lib/auth";
import PlanNewClient from "./PlanNewClient";

export const dynamic = "force-dynamic";

export default async function NewPlanPage() {
  await requireApproved();
  return <PlanNewClient />;
}
