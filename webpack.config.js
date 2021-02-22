const path = require('path');

module.exports = {
  entry: './build/module/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'cubism-ts.bundle.js',
    library: 'cubism',
  },
};
