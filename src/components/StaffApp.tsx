import { ApplicationForm } from "./ApplicationForm";
import { DocumentUpload } from "./DocumentUpload";
import { LenderTable } from "./LenderTable";
import { CommunicationPanel } from "./CommunicationPanel";
import { MarketingPanel } from "./MarketingPanel";
import { PipelineBoard } from "./PipelineBoard";
import { AdminDashboard } from "./AdminDashboard";
import { HealthMonitor } from "./HealthMonitor";
import "../styles/layout.css";

export function StaffApp() {
  return (
    <main>
      <section>
        <ApplicationForm />
        <DocumentUpload />
      </section>

      <LenderTable />

      <div className="panel-grid">
        <CommunicationPanel />
        <MarketingPanel />
      </div>

      <PipelineBoard />

      <div className="panel-grid">
        <AdminDashboard />
        <HealthMonitor />
      </div>
    </main>
  );
}

export default StaffApp;
