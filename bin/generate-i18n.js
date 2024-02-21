#!/usr/bin/env node

"use strict";

(async function main() {
    await require("../lib/cli/generate-i18n")
        .main()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
})();
