import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { PageHeader, Card, Label, Button, Select, Textarea } from "@/components/UI";
import { CheckCircle2 } from "lucide-react";

const PROBLEMS = [
  "Computer won't turn on",
  "Slow performance",
  "Keyboard problem",
  "Mouse problem",
  "Monitor/display problem",
  "Network/internet problem",
  "Software problem",
  "Virus/malware concern",
  "Printer problem",
  "Other",
];

export default function ReportProblem() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [computers, setComputers] = useState([]);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    computer_id: params.get("computer") || "",
    problem_type: PROBLEMS[0],
    description: "",
    additional_details: "",
  });

  useEffect(() => {
    api.get("/computers").then((r) => setComputers(r.data));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    await api.post("/reports", form);
    setDone(true);
  };

  if (done) {
    return (
      <div>
        <PageHeader title="Report submitted" />
        <Card className="p-8 text-center max-w-md">
          <div className="mx-auto h-10 w-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center mb-3">
            <CheckCircle2 size={20} />
          </div>
          <div className="text-sm font-semibold text-gray-900">Problem report submitted successfully.</div>
          <p className="text-sm text-gray-500 mt-1">Your report has been sent to the laboratory maintenance team.</p>
          <div className="flex gap-2 justify-center mt-4">
            <Button variant="outline" onClick={() => { setDone(false); setForm({ ...form, description: "", additional_details: "" }); }}>Submit another</Button>
            <Button onClick={() => nav("/my-reports")} testid="go-my-reports">View my reports</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        testid="report-problem-page"
        title="Report a Computer Problem"
        subtitle="Please describe what happened. A technician will be assigned shortly."
      />
      <Card className="p-6 max-w-2xl">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Computer</Label>
            <Select data-testid="select-computer" value={form.computer_id} onChange={(e) => setForm({ ...form, computer_id: e.target.value })} required className="w-full">
              <option value="">— Select computer —</option>
              {computers.map((c) => (
                <option key={c.computer_id} value={c.computer_id}>
                  {c.computer_id} — {c.laboratory}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>Problem Type</Label>
            <Select data-testid="select-problem-type" value={form.problem_type} onChange={(e) => setForm({ ...form, problem_type: e.target.value })} className="w-full">
              {PROBLEMS.map((p) => <option key={p}>{p}</option>)}
            </Select>
          </div>

          <div>
            <Label>What happened to the computer?</Label>
            <Textarea rows={5} data-testid="problem-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          </div>

          <div>
            <Label>Additional details (optional)</Label>
            <Textarea rows={3} value={form.additional_details} onChange={(e) => setForm({ ...form, additional_details: e.target.value })} />
          </div>

          <div>
            <Label>Attach image (optional)</Label>
            <input type="file" accept="image/*" className="block text-xs text-gray-700" />
            <p className="text-[11px] text-gray-500 mt-1">Image upload is a visual placeholder and is not uploaded in this stage.</p>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => nav(-1)}>Cancel</Button>
            <Button type="submit" testid="submit-report">Submit Report</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
