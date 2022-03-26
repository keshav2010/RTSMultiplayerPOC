const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
module.exports = {
    entry:'./public/game.js',
    output:{
        path: path.resolve(__dirname, 'dist'),
        filename:'bundle.js'
    },
    //loader for css
    module:{
        rules:[
            {
                test:/\.css$/i,
                use:['style-loader', 'css-loader']
            }
        ]
    },
    plugins:[
        new HtmlWebpackPlugin({template:'./index.html'})
    ],
    mode:"development"
}