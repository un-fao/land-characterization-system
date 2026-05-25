import { useRef,useEffect,useState } from "react";
import randomstring from "randomstring";
import { Loading }  from "./Loading";

import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primeflex/primeflex.css";
import 'primeicons/primeicons.css';
import 'fontawesome/css/all.css';

import UserInterface from "./components/UserInterface";

export const searchObj = (objects,searchKey)=>{        
  return objects.filter(obj => Object.keys(obj).some(key => obj[key] === searchKey));
}
export const searchObjKeyVal = (objects,searchKey,searchVal)=>{
  if(searchVal !== null){
    const regexSearch = (searchSubject) => {
      if(searchSubject !== null){
        let search = searchVal.replace(/[^\w\s]/gi, '');
        let regexObj = new RegExp('\^'+search+'\$', "i");
        if (regexObj.test(searchSubject.replace(/[^\w\s]/gi, '')))
          return true;
      }
      else
        return "*";
    };  
    //return objects.filter(obj => Object.entries(obj).some(entry => (entry[0] === searchKey && entry[1] === searchVal)));
    return objects.filter(obj => Object.entries(obj).some(entry => (entry[0] === searchKey && regexSearch(entry[1]))));
  }
  else
    return [];
}
export const fuzzySearchObjKeyVal = (objects,searchKey,searchVal)=>{
  const regexSearch = (searchSubject) => {
    let regexObj = new RegExp(searchVal+'\(s\)\?', "i");
    if (regexObj.test(searchSubject))      
      return true;    
  };
  return objects.filter(obj => Object.entries(obj).some(entry => (entry[0] === searchKey && regexSearch(entry[1]))));
}

function App() {
  const queryParameters = new URLSearchParams(window.location.search);
  const tool = queryParameters.get("tool");
  const [UUID,setUUID] = useState<string>(randomstring.generate(8)+"-"+randomstring.generate(4)+"-"+randomstring.generate(4)+"-"+randomstring.generate(4)+"-"+randomstring.generate(12));
  const translator = useRef<[]>([]);
  const legendTemplate = useRef<[]>([]);
  const options = useRef<[]>([]);
  const blockLookUp = useRef<[]>([]);
  const blocks = useRef<[]>([]);
  const characteristicLookUp = useRef<[]>([]);
  const characteristics = useRef<[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const getJSON=(JSONfile,stateVar)=>{
  fetch(JSONfile,{headers : {'Content-Type': 'application/json', 'Accept': 'application/json'}})
      .then(function(response){
      return response.json();
      })
      .then(function(JSON) {
        eval(stateVar+".current=JSON;");
        if(stateVar === "blocks"){//adjust to the largest file.
          setTimeout(() => {
            setIsLoading(false);
          }, 5000);
        }
      });
  };    
  useEffect(()=>{
      getJSON('components/DataSources/Legend_Translator.json','translator');
      getJSON('components/DataSources/LC_Legend.json','legendTemplate');
      getJSON('components/DataSources/LC_Options.json','options');
      getJSON('components/DataSources/Block_Block_LookUp.json','blockLookUp');
      getJSON('components/DataSources/LC_Blocks.json','blocks');
      getJSON('components/DataSources/Block_Characteristic-LookUp.json','characteristicLookUp');
      getJSON('components/DataSources/LC_Characteristics.json','characteristics');
  },[]);

  return (
  <> 
    {isLoading && <Loading />}
    {(!isLoading && !tool) &&
        <UserInterface 
          UUID={UUID}
          translator={translator.current}
          legendTemplate={legendTemplate}
          options={options}
          blocks={blocks}
          blockLookUp={blockLookUp}
          characteristics={characteristics}
          characteristicLookUp={characteristicLookUp}
          />
    }
  </>
  )
}

export default App;
