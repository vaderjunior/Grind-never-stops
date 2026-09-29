# Readable course diagrams

The same renderer handles all 165 Learn diagrams and 93 diagrams in the authored reference library. `shared/diagram-config.json` supplies one configuration for the application and diagram export checks.

Use root-level `htmlLabels: false`. The installed Mermaid version gives this setting precedence over the older `flowchart.htmlLabels` option. Native SVG text avoids embedded HTML label reflow and clipping. Wrapped lines keep their full wording. Initialize Mermaid once; do not reinitialize it separately for each mounted diagram.

`prepareDiagramSource` displays left/right flowcharts from top to bottom without changing their nodes, labels, or connections. Sequence diagrams retain participant columns and chronological messages. The canonical lesson JSON remains unchanged, so existing teaching reviews and assessments remain valid.

At the default zoom, the reader fits a diagram only down to 87.5% of its natural size. Wider or taller diagrams scroll inside their frame; the whole page does not overflow. The scrollable illustration is keyboard focusable. Zoom, expansion, and Escape retain their controls. Narration may emphasize a mapped edge or node but must not fade other labels out.

Every diagram has a **Read diagram as text** disclosure with its original caption, narration, and complete SVG labels. This is a teaching alternative, not raw Mermaid source. Printing includes the narration and all labels, and keeps a tall SVG within the printable height. Extremely tall graphs may use smaller overview text on paper; their separate label list remains readable.

## Verification

`npm run test:diagrams` checks all diagrams in the actual React component and styles: desktop light/dark, 390px light/dark, label geometry and visibility, default text size, text alternatives, and any authored highlighting. Its development-only gallery lives under `scripts/`; it is not a production route. Tests use isolated learner data.

`npm run test:diagram-controls` checks the originally reported diagram on the built production page, including full wording, zoom, expansion, keyboard scrolling, focus restoration, and the tallest diagram's print layout. `npm run diagrams` regenerates all standalone diagram evidence with the same configuration. Incremental render reuse requires both source and configuration hashes to match.

Current results are in `artifacts/diagram-readability/report.json`, `controls-report.json`, and `artifacts/diagram-validation.json`. Windows/Edge is the tested browser. Representative screenshots and print pages were visually inspected; automated geometry checks do not establish every browser or assistive technology's behavior.
