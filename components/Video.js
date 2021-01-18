class Video extends React.Component {
    constructor(props) {
        super(props);
    }
    render() {
        let data = this.props.data;

        let videoContent = <video src={data.videoSrc} controls/>
        if (!data.videoSrc) {
            let iframeAtts = data.embed.split("<iframe ")[1].split("></iframe>")[0];
            let src = iframeAtts.split('src="')[1].split('"')[0];
            let frameborder = iframeAtts.split('frameborder="')[1].split('"')[0];
            let width = iframeAtts.split('width="')[1].split('"')[0];
            let height = iframeAtts.split('height="')[1].split('"')[0];
            let afterAllow = iframeAtts.split('allow="')[1]; // TODO: Allow use of optional chaining
            let allow = '';
            if (afterAllow) allow = afterAllow.split('"')[0] || '';

            videoContent = <iframe src={src} frameBorder={frameborder} width={width} height={height} allow={allow} scrolling="no" allowFullScreen></iframe>
        }

        return (
            <div className="Video">
                <div className="video-result-video-col">
                    <h3>{this.props.data.title}</h3>
                    {videoContent}
                    <a className="video-result-url" href={this.props.data.url}>{this.props.data.url}</a>
                </div>
                <div className="video-result-transcript-col">No Transcript Available</div>
            </div>
        )
    }
}