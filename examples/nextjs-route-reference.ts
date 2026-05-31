import {
  formatMarkdownContractReport,
  validateToolRegistry,
  type ToolContract
} from "../src/index.js";

// Reference only. Copy the pattern into your own Next.js route if useful.
export async function POST(request: Request) {
  const body = await request.json() as { tools?: ToolContract[] };
  const report = validateToolRegistry(body.tools ?? [], {
    requireOwner: true,
    requireVersion: true,
    approvalRequiredForRisks: ["high", "critical"]
  });

  if (report.status === "fail") {
    return Response.json({
      ok: false,
      report,
      markdown: formatMarkdownContractReport(report)
    }, { status: 422 });
  }

  return Response.json({ ok: true, report });
}
