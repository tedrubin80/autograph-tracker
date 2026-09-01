# Playwright's own image ships Chromium plus every system library it needs
# already baked into this layer. A Railpack/Nixpacks build installs those
# libs during the *build* stage only, which doesn't carry over to the
# separate runtime container — that's what crashed the first deploy
# (`libglib-2.0.so.0: cannot open shared object file`). This sidesteps that
# entirely by using an image where the runtime layer already has them.
#
# Keep this tag in sync with the `playwright` version in package.json.
FROM mcr.microsoft.com/playwright:v1.49.1-noble

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY scrape.mjs ./

CMD ["node", "scrape.mjs"]
