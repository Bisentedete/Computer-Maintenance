import React from "react";
import { PageHeader, Card } from "@/components/UI";

export default function Settings() {
  return (
    <div>
      <PageHeader testid="settings-page" title="Settings" subtitle="System preferences." />
      <Card className="p-6 max-w-2xl">
        <div className="space-y-4 text-sm text-gray-700">
          <div>
            <div className="text-xs font-semibold text-gray-700 mb-1">Organization</div>
            <div>School Computer Laboratory</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-700 mb-1">Monitoring API</div>
            <div className="text-gray-500">Not configured. Placeholder values are shown on computer detail pages.</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-700 mb-1">Troubleshooting AI</div>
            <div className="text-gray-500">Static responses enabled. AI integration can be enabled later.</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
