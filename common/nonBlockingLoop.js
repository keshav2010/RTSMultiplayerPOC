
/**
 * 
 * @param {Function} testConditionCallback 
 * @param {Function} body 
 * @param {Function} onEnd 
 */
function nbLoop(testConditionCallback, body, onEnd)
{
    if(testConditionCallback()){
        if(body()) {
            setImmediate(nbLoop, testConditionCallback, body, onEnd);
        }
        else if(onEnd)
            onEnd();
    }
    else if(onEnd)
        onEnd();
}
module.exports = nbLoop;