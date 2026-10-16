import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/$categoria", params: { categoria: "mouse" }, replace: true });
  },
});
