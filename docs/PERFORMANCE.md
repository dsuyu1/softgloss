# Browser performance and reading interaction checks

Run the existing pinned Playwright browser suite with `node browser-tests/smoke.mjs`; CI uploads `test-results/performance.json` in the browser-evidence artifact.

The report records the Node version, runner CPU/platform and Chromium version, first activation/injection wall time, whole-renderer JS heap before/after the reading smoke flow, and a dynamic rescan of 2,000 paragraphs (6,000 Korean tokens). It samples animation-frame gaps and long tasks while the page is being highlighted. Warm lookup timing remains a separate batch-mean report.

The heap samples cover the page renderer, including page and extension JavaScript, with no forced GC. They are neither extension-only memory nor total browser RSS. Activation time includes loading packaged scripts and worker messaging; dictionary indexing and asynchronous painting can continue afterward. These measurements are CI reference evidence, not a laptop or mobile performance guarantee.

A p95 animation-frame-gap ceiling of 100 ms is enforced for the synthetic long-page workload. This differs from individual dictionary lookup latency; batching and timer resolution also limit the existing warm lookup estimate. The actual rescan duration, maximum frame gap and long tasks are reported without concealing outliers. The scan remains capped at 10,000 nodes / 500,000 characters / 10,000 characters per node, and yields between nodes after about 8 ms. A single node, GC or browser rendering may exceed that work budget.

Interaction checks use actual pointer coordinates over Korean text and blank space, DOM text selection plus a mouseup event, editable-input hover exclusion, and close/focus behavior. The test harness still grants localhost access to a temporary extension copy. Actual toolbar activeTab grants, OS shortcut delivery, screen-reader use, real browser zoom and Anki import remain manual checks.
