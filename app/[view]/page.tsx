import { ViewRoutePage } from "@/app/[view]/view-route-page";

export const dynamic = "force-dynamic";

export default function ViewPage({
  params
}: {
  params: Promise<{ view: string }>;
}) {
  return <ViewRoutePage params={params} />;
}
