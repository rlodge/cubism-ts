const path = require('path');

module.exports = {
  entry: './build/module/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'cubism-ts.bundle.js',
    library: 'cubism',
  },
  externals: {
    "d3-axis": "d3",
    "d3-dispatch": "d3",
    "d3-fetch": "d3",
    "d3-format": "d3",
    "d3-interpolate": "d3",
    "d3-scale": "d3",
    "d3-selection": "d3",
    "d3-time-format": "d3"
  }
};
