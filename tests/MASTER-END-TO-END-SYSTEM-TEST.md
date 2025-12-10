# Master End-to-End System Test Suite

Comprehensive cross-system scenarios covering the Client App, Staff-Server, and Staff-Portal. Execute regularly to validate interoperability and data consistency across silos.

1. **Client App → Staff-Server interoperability**
   - Validate submissions propagate to Staff-Server with correct tenant context, payload structure, and acknowledgements.

2. **Client App → Staff-Portal visibility**
   - Ensure new applications and updates appear in Staff-Portal within SLA, respecting silo/role constraints.

3. **Document lifecycle from client → storage → staff portal**
   - Upload from client, confirm storage persistence, DB record creation, and visibility with preview/download in Staff-Portal.

4. **OCR lifecycle**
   - Verify OCR jobs enqueue after upload, callbacks update metadata, and results display in portal with timelines.

5. **Banking analysis lifecycle**
   - Test banking connections/statements from client, analysis job execution, result storage, and portal presentation.

6. **AI insights → credit summary behavior**
   - Confirm AI analyses generate credit summaries, PDFs, and surface insights consistently between systems.

7. **Lender matching**
   - Validate matching logic outputs consistent products/quotas in Staff-Portal and Staff-Server APIs.

8. **Send-to-lender routing**
   - Trigger send-to-lender from portal; confirm payloads, acknowledgements, and status tracking in all systems.

9. **Status propagation back to client**
   - Ensure lender responses or internal status changes sync back to client UI with notifications.

10. **Voice/SMS/Email routing via Communication Center**
    - Test omnichannel communication flows, verifying logs and timelines across systems.

11. **CRM timeline verification**
    - Confirm all events (uploads, OCR, banking, signatures, communications) generate timeline entries in every system view.

12. **Multi-silo segregation (BF / BI / SLF)**
    - Validate data isolation, branding, and configuration differences per silo for all flows.

13. **Authentication + role checks**
    - Ensure each system enforces role-based access, MFA, and token lifecycles during end-to-end flows.

14. **Data consistency checks across all systems**
    - Cross-verify critical fields (status, product selections, document states) match between Client App, Staff-Server, and Staff-Portal databases and UIs.
