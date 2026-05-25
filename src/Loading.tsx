import ReactLoading from 'react-loading';

export const Loading = () => {
    return (
      <div className="loading flex flex-column align-items-center justify-content-center" style={{ width: '100vw', height: '100vh' }}>
        <div className="loading flex flex-row" style={{ width: '200px' }} ><img src='logo.png' alt='Land CHaracterization System'  style={{ width: '100px' }} /><img src='fao-logo.png' alt='Food and Agriculture Organization of the United Nations' style={{ width: '100px' }} /></div>
        <p>Land CHaracterization System software loading...</p>
        <ReactLoading type="spinningBubbles" color="#007bff" height={100} width={100} />
      </div>
    );
}
