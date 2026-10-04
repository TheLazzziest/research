import { Card, CardBody, Typography } from "./ui.tsx";
import { Planner } from "./components/Planner.tsx";

export function App() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Typography variant="h3" className="mb-1">
        Allergy-safe meal planner
      </Typography>
      <Typography variant="small" className="mb-6 font-normal text-blue-gray-500">
        Type or speak. The plan comes from a versioned skill graph, run on open-weight models via the Backboard
        adapter, and answers can be read aloud. Voice input needs Chrome or Edge; typing works everywhere.
      </Typography>
      <Card>
        <CardBody>
          <Planner />
        </CardBody>
      </Card>
    </main>
  );
}
