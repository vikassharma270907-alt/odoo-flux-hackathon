import asyncio
import os
import subprocess
import edge_tts

SCENES = [
    {
        "id": "scene_01",
        "title": "Title & Platform Overview",
        "text": "Hi, this is Brightloop — a complete, production-grade subscription management system built for the Odoo and FLUX Lucknow hackathon. It runs a modern subscription business end to end: products and variants, quotation to subscription workflows, automated recurring invoicing, smart discounts, multi-stage payments, and an executive finance dashboard. Built on a custom Node 20 and PostgreSQL 16 backend with a React 18 frontend — there is no static JSON or backend as a service. Everything you see is read from or written to a real relational database."
    },
    {
        "id": "scene_02",
        "title": "The Subscription Problem & Core Challenges",
        "text": "Subscriptions look deceptively simple on the surface, but are fraught with failure points in practice. You have to bill every customer for every active period without ever billing twice or skipping due cycles. You have to automatically apply the right discounts, manage threshold rules, and calculate tiered taxes at the exact right moment. Every subscription must transition through an immutable, strictly validated state machine, and your finance metrics must remain accurate in real time at high scale. Brightloop solves these complexities with three pillars: idempotent billing engines, automated fiscal rules, and enterprise role-based access control."
    },
    {
        "id": "scene_03",
        "title": "Three-Tier Decoupled Architecture",
        "text": "Architecturally, Brightloop is built on a clean three-tier decoupled structure. The frontend is a modern React single-page application built with Vite and Tailwind CSS, communicating with our REST API using Bearer JWT tokens. The Express API routes every single request through a rigorous security and validation pipeline: authentication, role verification, and strict Zod schema parsing. Thin route handlers delegate immediately to transactional service layers, which enforce pure domain business rules. PostgreSQL 16 performs the heavy lifting: parameterised SQL prevents injection, row-level locks prevent race conditions, and real-time database views power the executive dashboard."
    },
    {
        "id": "scene_04",
        "title": "Admin Catalogue Setup & The Odoo Variant",
        "text": "Let's step into the system as an administrator. The admin controls the entire product catalogue. Products can carry dynamic variants with custom pricing rules. For example, our 'Brand equals Odoo' variant adds a five hundred and sixty rupee premium, elevating the base price from two thousand to two thousand five hundred and sixty rupees. Plans define the recurring billing cadence — daily, weekly, monthly, or yearly — alongside crucial operational flags like auto-close, early termination, and pause permissions. Furthermore, administrators can configure rule-based discounts, such as ten percent off for five or more seats, which automatically attach to the next invoice cycle and expire once the threshold or date limit is reached."
    },
    {
        "id": "scene_05",
        "title": "Quotation to Subscription Lifecycle State Machine",
        "text": "Next, let's explore onboarding a customer. Subscriptions can be launched directly from a quotation template, automatically pulling in the plan cadence, line items, and pricing snapshots with real-time tax previews. Once we assign the customer, the subscription begins its lifecycle: moving from Draft, to Quotation, to Confirmed, and finally to Active. The critical engineering detail here is that the interface only permits legally valid next transitions. This state machine is hardcoded into the backend domain logic. Any attempt to bypass the frontend and force an illegal transition returns an HTTP 409 Conflict error. Integrity is maintained at the database level."
    },
    {
        "id": "scene_06",
        "title": "The Signature Moment: Idempotent Billing Engine",
        "text": "Now for Brightloop's signature technical feat: automated recurring billing. In the billing module, staff can execute a billing run. The engine queries all active subscriptions due today and issues four hundred and twenty-nine invoices in one atomic operation, complete with calculated taxes and applied discount redemptions. Now, watch what happens when we immediately trigger the billing run a second time. Zero invoices are created, and four hundred and twenty-nine periods are reported as skipped. Nothing is ever double-billed. This guarantee is enforced by PostgreSQL using a unique composite constraint on subscription ID and period start, backed by insert on conflict do nothing semantics and per-subscription FOR UPDATE row locks."
    },
    {
        "id": "scene_07",
        "title": "Invoice Settlement & Payment Processing",
        "text": "Payments bring the billing cycle to a clean conclusion. When we inspect an invoice, we can record a partial payment — for instance, fourteen hundred rupees against a balance of twenty-eight hundred and sixteen rupees. The invoice remains in Confirmed status, clearly reflecting the remaining unpaid balance. When we record the final settlement, the invoice status automatically flips from Confirmed to Paid. In Brightloop, Paid is not a toggleable status that can be edited arbitrarily; it is an emergent state reachable only through real, validated payment records. Furthermore, overpayments are strictly rejected with an HTTP 409 error."
    },
    {
        "id": "scene_08",
        "title": "Role-Based Access Control & Strict Validation",
        "text": "Security and permission boundaries are strictly partitioned across three distinct roles. Administrators govern the catalogue and provision staff credentials. Staff manage operational workflows — subscriptions, invoices, billing runs, and payment collection — but cannot alter master catalogue configurations. Customers access their own dedicated self-service portal, scoped exclusively to their own subscriptions and billing receipts. Any attempt by a customer to hit staff or admin routes triggers an immediate HTTP 403 Forbidden. Input validation is equally robust: weak passwords, malformed emails, or invalid dates trigger instant, structured field-level error feedback."
    },
    {
        "id": "scene_09",
        "title": "Executive Finance Dashboard & Scale",
        "text": "Switching to the operational staff view, the finance dashboard provides instant business intelligence. Real-time KPI summary cards display active subscriptions, monthly recurring revenue, cash collected to date, outstanding receivables, and overdue amounts. It features an interactive monthly revenue chart, an overdue receivables table sorted oldest-first for collection priority, and one-click CSV export functionality. Crucially, these analytics are not computed through expensive JavaScript loops; they are computed directly inside PostgreSQL views. Even with our seeded dataset of over five thousand subscriptions and twelve thousand invoices, heavy list and dashboard queries respond in twenty to forty milliseconds, far outperforming the two-second hackathon requirement."
    },
    {
        "id": "scene_10",
        "title": "Comprehensive Verification & Engineering Rigor",
        "text": "Every claim in Brightloop has been rigorously verified against live infrastructure. Our automated test suite includes forty-seven passing tests: thirty-five unit and access-control tests covering pure domain logic, and twelve database-backed integration tests verifying transaction rollbacks and concurrency locks. Billing idempotency is mathematically proven. Role scoping is verified with negative integration assertions. The entire platform runs with a single command via Docker Compose, features full interactive OpenAPI documentation at slash api slash docs, and is deployed live to production on Render with a dedicated managed PostgreSQL cluster."
    },
    {
        "id": "scene_11",
        "title": "Conclusion & Production Readiness",
        "text": "In conclusion, Brightloop delivers a complete, resilient, and enterprise-grade subscription billing platform. With its custom relational architecture, real dynamic data flows, strictly enforced state machines, idempotent recurring billing engine, role-based access control, and high-performance finance dashboards, Brightloop sets a high standard for subscription engineering. Thank you for watching. The live demo application, OpenAPI documentation, and GitHub repository are accessible on screen for your review."
    }
]

VOICE = "en-US-ChristopherNeural"
OUT_DIR = "d:/odoo flux hackathon/demo-video/audio"

async def generate_scene_audio(scene):
    os.makedirs(OUT_DIR, exist_ok=True)
    out_file = os.path.join(OUT_DIR, f"{scene['id']}.mp3")
    print(f"Generating audio for {scene['id']}...")
    comm = edge_tts.Communicate(scene["text"], VOICE, rate="+8%")
    await comm.save(out_file)
    print(f"Saved {out_file}")

async def main():
    for scene in SCENES:
        await generate_scene_audio(scene)
    print("All audio files generated successfully!")

if __name__ == "__main__":
    asyncio.run(main())
