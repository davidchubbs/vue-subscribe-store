const path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    filename: 'index.min.js',
    path: path.resolve(__dirname, 'dist')
  }
}
