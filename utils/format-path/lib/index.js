"use strict";

const path = require("path");

module.exports = formatPath;

function formatPath(paths) {
  if (paths && typeof paths === "string") {
    const sep = path.sep;
    // console.log('format',sep);
    return sep === "/" ? paths : paths.replace(/\\/g, "/");
  }
	return paths;
}
