export default {
  fetch() {
    return new Response("urlattice redirector is not configured", {
      status: 503,
    });
  },
} satisfies ExportedHandler;
