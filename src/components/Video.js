import React from 'react';

class Video extends React.Component {
    constructor(props) {
        super(props);
        this.handleRemoval = this.handleRemoval.bind(this);
    }

    handleRemoval() {
        this.props.removeVideo(this.props.data.url);
    }

    render() {
        let data = this.props.data;

        let videoContent = <video src={data.videoSrc} controls/>
        if (!data.videoSrc || data.videoSrc.includes("blob:")) {
            let iframeAtts = data.embed?.split("<iframe ")[1]?.split("></iframe>")[0];

            let src = iframeAtts?.split('src=')[1]?.split(' ')[0];
            src = src ? src.slice(1, src.length - 1) : '';

            let frameborder = iframeAtts?.split('frameborder=')[1]?.split(' ')[0];
            frameborder = frameborder ? frameborder.slice(1, frameborder.length - 1) : '';

            let width = iframeAtts?.split('width=')[1]?.split(' ')[0];
            width = width ? width.slice(1, width.length - 1) : '';

            let height = iframeAtts?.split('height=')[1]?.split(' ')[0];
            height = height ? height.slice(1, height.length - 1) : '';

            let allow = iframeAtts?.split('allow=')[1]?.split(' ')[0];
            allow = allow ? allow.slice(1, allow.length - 1) : '';

            videoContent = <iframe src={src} frameBorder={frameborder} width='560' height='315' allow={allow} scrolling="no" allowFullScreen></iframe>
        }

        let jsx = [];
        if (this.props.data.transcript) {
            for (let transcript of this.props.data.transcript) {
                let entry = (
                <div className="transcript-line" key={transcript.timestamp}>
                    <div className="transcript-time">{transcript.timestamp}</div>
                    <div className="transcript-text">{transcript.dialogue}</div>
                </div>
                );
                jsx.push(entry);
            }
        }
        else jsx = 'No Transcript Available';

        return (
            <div className="Video">
                <div className="video-content">
                    <div className="video-result-video-col">
                        <h3>{this.props.data.title}</h3>
                        <div className="video">
                            {videoContent}
                        </div>
                    </div>
                    <div className="video-result-transcript-col">
                        {jsx}
                    </div>
                </div>
                <div className="video-options">
                    <button className="video-removal-btn" onClick={this.handleRemoval}>Remove</button>
                    <a className="video-result-url" href={this.props.data.url} target="_blank">Go to link</a>
                </div>
            </div>
        )
    }
}

export default Video;