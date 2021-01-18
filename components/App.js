class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {results: []}

        this.addVideoContent = this.addVideoContent.bind(this);
    }

    addVideoContent(results) {
        this.setState((state, props) => ({
            results: [...state.results, ...results]
        }))
    }

    render() {
        return (
            <div>
                <h1>Video Web Scraper</h1>

                <FormList addVideoContent={this.addVideoContent}/>
                <VideoList results={this.state.results}/>
            </div>
        )
    }
}

ReactDOM.render(<App/>, document.querySelector("#root"));