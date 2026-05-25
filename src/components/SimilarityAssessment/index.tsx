import { useRef,useState } from 'react';
import { Upload } from "./Upload";
import { Comparator } from './Comparator';

import "./style.module.css";

export const SimilarityAssessment = (props) => {
    const {UUID,        
        translator,
        legendTemplate,
        options,
        blocks,
        blockLookUp,
        characteristics,
        characteristicLookUp,
        setSimilarityAssessmentVisible
    } = props;

    const [fileContent, setFileContent] = useState([]);
    const [visibleUpload, setUploadVisible] = useState<boolean>(true);
    const [visibleComparator, setComparatorVisible] = useState<boolean>(false);

    const [method, setMethod] = useState<'Correspondence' | 'Element Count'>('Correspondence');

    return (
        <>
            {visibleUpload && <Upload
                UUID={UUID}
                translator={translator}
                legendTemplate={legendTemplate}
                options={options}
                blocks={blocks}
                blockLookUp={blockLookUp}
                characteristics={characteristics}
                characteristicLookUp={characteristicLookUp}
                fileContent={fileContent}
                setFileContent={setFileContent}
                setUploadVisible={setUploadVisible}
                setComparatorVisible={setComparatorVisible}
                method={method}
                setMethod={setMethod}
                />}
            {visibleComparator && <Comparator
                UUID={UUID}
                translator={translator}
                legendTemplate={legendTemplate}
                options={options}
                blocks={blocks}
                blockLookUp={blockLookUp}
                characteristics={characteristics}
                characteristicLookUp={characteristicLookUp}
                fileContent={fileContent}
                setUploadVisible={setUploadVisible}
                setComparatorVisible={setComparatorVisible}
                method={method}
                />}
        </>
    )
}
