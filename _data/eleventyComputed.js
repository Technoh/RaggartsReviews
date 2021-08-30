const fs = require('fs');

module.exports = {
  modificationDate: data => data?.page?.inputPath ? fs.statSync(data.page.inputPath).mtime : undefined,
}