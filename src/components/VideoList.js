import React from 'react';
import Video from './Video.js';

class VideoList extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        let jsx = this.props.results.filter(v => {
            let validSrc = false;
            if (v.videoSrc && !v.videoSrc?.includes("blob:")) validSrc = true;
            return validSrc || v.embed;
        })
            .map(result => {
                return <Video data={result} key={result.uuid} removeVideo={this.props.removeVideo} handlePreview={this.props.handlePreview} />
            })
        return (
            <div className="VideoList">
                {jsx}
            </div>
        )
    }
}

export default VideoList;