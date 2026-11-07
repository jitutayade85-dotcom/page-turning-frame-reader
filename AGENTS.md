<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep spread splitting and conservative edge-connected finger cleanup in the shared browser image pipeline; review, OCR, and PDF must consume the same left-to-right output pages so edits never diverge between display and export.
- Compute scan contrast percentiles with a fixed-bin histogram to keep pixel processing linear and avoid image-sized sort allocations.
- Cache preview blobs by weak source identity and edit values with bounded revisions; components own/revoke URLs, debounce editor changes, and serialize preview rendering to reduce main-thread contention.
- Run OCR through the ordered, bounded batch helper so page failures preserve image export and cancellation stops remaining work.
