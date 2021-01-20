import React from 'react';
import Video from './Video.js';

class VideoList extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        let jsx = this.props.results.filter(v => {
            let validSrc = true;
            validSrc = v.videoSrc ? true : false;
            validSrc = v.videoSrc?.includes("blob:") ? false : true;
            return validSrc || v.embed;
        })
        .map(result => {
            return <Video data={result} key={result.url} removeVideo={this.props.removeVideo}/>
        })
        return (
            <div className="VideoList">
                {jsx}
            </div>
        )
    }
}

export default VideoList;