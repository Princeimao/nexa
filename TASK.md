# Nexa — BRICS AI for Digital Public Infrastructure & Governance

Build **Nexa**, a polished, production-quality hackathon MVP for the BRICS Track 1 challenge:

> Build a scalable, multilingual AI platform that aggregates citizen development requests via voice, text and messaging apps, combines them with demographic, infrastructure and public-investment data, and surfaces development hotspots and priorities for policymakers.

## Core idea

Citizens can report problems naturally through **WhatsApp or phone calls**.

Example:

Citizen:

> "Mere gaon mein 3 hafte se paani nahi aa raha."

Nexa should understand the complaint, identify missing information such as location, ask follow-up questions naturally, remember the conversation state, confirm the information, and register the complaint.

Use **in-memory for conversational state/session memory**.

For this prototype, **do NOT implement queues, workers, Kafka, RabbitMQ, BullMQ or similar infrastructure**. Process WhatsApp/voice messages directly in the application for real-time interaction. PostgreSQL remains the persistent source of truth.

## AI architecture

Make the platform **AI-provider and model agnostic**.

By "AI at every layer", I mean AI should be usable wherever it provides value:

- multilingual citizen conversation
- speech-to-text / text-to-speech
- complaint understanding and classification
- missing-information detection
- location/entity extraction
- severity/impact analysis
- hotspot and development analysis
- policy-plan analysis
- policymaker AI analyst
- recommendations and explanations

Do not hard-code the system around one LLM, language or AI provider. Create clean abstractions so different models/providers can be used for different tasks and languages.

AI must not invent government statistics or recommendations. Analytical calculations should come from actual data, and the AI should explain the evidence.

## Development intelligence

The platform must go beyond complaint management.

Combine citizen requests with:

- demographic data
- population
- infrastructure data
- infrastructure gaps
- public investment
- government/development projects
- geographic data
- historical and current complaint trends

Identify:

- demand hotspots
- infrastructure gaps
- underserved areas
- emerging/persistent problems
- high-impact development needs
- areas with high demand but insufficient projects/investment
- project implementation gaps
- changes after projects are implemented

Also build a **Current Plan / Policy Gap analysis**.

For India, seed realistic demo data representing current-year development plans/projects and allow policymakers to ask things such as:

> "Which infrastructure problems are not adequately addressed by the current year's plans?"

> "Which districts have high citizen demand but no corresponding project?"

> "What major problems are emerging that current plans don't address?"

The architecture should remain country-agnostic even though the initial demo/data can focus primarily on India.

## Policymaker experience

Build a **premium, futuristic government intelligence dashboard**, not a CRUD/admin dashboard.
Use **shadcn/ui** and high-quality **React Bits** components/animations where appropriate:
Mostly use white or off white colors so it look premium and government kind of website. And don't make it too much shiny and modern.

You can take help of mcp servers of reactbits, shadcn, gsap or any kind of other library which was added.

https://reactbits.dev/

The UI should have excellent visual hierarchy, smooth purposeful animations, interactive charts, beautiful transitions, map interactions, drill-downs and polished micro-interactions.

Make it feel like a world-class decision-intelligence product that a policymaker would actually want to use.

Include:

- interactive geographic map
- hotspots
- infrastructure gaps
- affected population
- investment/project information
- trends
- current-plan gaps
- project impact
- geographic drill-down
- powerful filters
- evidence behind insights
- AI Policy Analyst

The geographic hierarchy must be configurable rather than hardcoded to Indian administrative levels so the platform can eventually support other BRICS countries.

## Policy AI

The policymaker should be able to ask natural-language questions such as:

> "Bahraich mein sabse badi infrastructure problem kya hai?"
> "Why is this area a high priority?"
> "Which areas have many complaints but no related government project?"
> "What problems are not covered by the current year's development plans?"
> "Which problems are increasing fastest?"
> "What changed after this project was completed?"

Answers must be grounded in the actual database/application data. Use safe, controlled read-only data access rather than unrestricted AI database writes.

Show supporting evidence whenever useful.

## Prototype data

Create a substantial, realistic **India-focused demo dataset** containing citizens' requests, locations, demographics, infrastructure, public projects/plans and historical/current trends.

Seed meaningful patterns so the demo can visibly show hotspots, gaps, investment mismatches and plan gaps.

Do not make the dataset so India-specific that the core architecture cannot support other BRICS countries.

## Technology

Use:

- Node.js
- Express
- TypeScript
- PostgreSQL
- Prisma 7
- Redis
- React
- Vite
- TypeScript

Use sensible modern libraries for maps, charts, animation and UI.
Use the existing WhatsApp API provided through environment variables.
Use Twilio for voice where practical.

## Important

You are an autonomous coding agent. **Do not ask me to design the database, architecture, API or component structure. Think through those decisions yourself and implement them.**

Do not over-engineer this into microservices.

Do not add queues/workers.

Prioritize:

1. Beautiful policymaker experience
2. Natural multilingual citizen interaction
3. Real-time Redis conversation state
4. Development intelligence
5. Current-plan/policy gap analysis
6. Data-grounded Policy AI
7. Interactive map and visualizations
8. WhatsApp
9. Voice

Build the **actual working MVP**, not just scaffolding. Seed it with enough data to make the entire product demonstrable end-to-end.


