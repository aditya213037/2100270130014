//calculator microservice
const express = require("express");
const app = express();
const axios = require('axios');
app.use(express.json());//data is sent to the server in the form of json
const port = 9876;
const WIN_SIZE = 10;

//make post endpoints
//numbers/previous state/current state/avg

//the test server:http://20.244.56.144/test

function average(list)
{
    if(list.length == 0)
    {
            return 0;
    }
    let avg = 0;
    for(let i of list)
    {
        avg+=i;
    }
    return avg/list.length;
}

//get the list of numbers from the api
//first we get the numbers along with the id form

const get_Numbers = async(type) => 
{
    try 
    {
        const res = await axios.get(`http://20.244.56.144/numbers/${type}`);
        return res.data.numbers;//numbers is the list
    } 
    catch (error) 
    {
        console.error('Error fetching numbers:', error.message);
        return "Empty";
    }
};

//prime,fibonacci,even,random
app.get("/numbers/:type",async (req,res)=>{
    const type = req.params.type;
    //consider invalid parameter
    if (type!='p' && type!='f' && type!='e' && type!='r') 
    {
        return res.status(400).json
        (
            { error: 'Invalid type parameter' }
        );
    }
    //fetch the numbers from api
    const Numbers = await get_Numbers(type);
    //for solution we need the previous state
    const Prev_state = [...Numbers];
    //remove duplicates
    const Unique_Numbers = [...new Set(Numbers)];

    //remove old number if window size exceeds
    while (Unique_Numbers.length > WIN_SIZE) 
    {
        Unique_Numbers.shift();
    }
    
    const sol = average(Unique_Numbers);

    res.json(
        {
            "numbers":Numbers,
            "windowPrevState":Prev_state,
            "windowCurrState": Unique_Numbers,
            "avg":sol
        }
    )

});

app.listen(port, () => {
    console.log(`Server running at port ${port}`);
});