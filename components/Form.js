class Form extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            id: null,
            searchTerm: '',
            minTime: '',
            count: '',
            website: '',
            progress: 0,
            searchInProgress: false
        }

        this.handleSearchChange = this.handleSearchChange.bind(this);
        this.handleTimeChange = this.handleTimeChange.bind(this);
        this.handleCountChange = this.handleCountChange.bind(this);
        this.handleWebsiteChange = this.handleWebsiteChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.pollServer = this.pollServer.bind(this);
    }

    handleSearchChange(event) {
        this.setState({searchTerm: event.target.value});
    }

    handleTimeChange(event) {
        this.setState({minTime: event.target.value});
    }

    handleCountChange(event) {
        this.setState({count: event.target.value});
    }

    handleWebsiteChange(event) {
        this.setState({website: event.target.value});
    }

    async handleSubmit(event) {
        let response = await fetch("/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                keyword: this.state.searchTerm,
                min: this.state.minTime,
                count: this.state.count,
                website: this.state.website
            })
        })
        let data = await response.json();
        this.setState({
            id: data.id
        });
        this.setState({searchInProgress: true});
        setTimeout(this.pollServer, 5000);
    }

    async pollServer() {
        fetch(`/status?id=${this.state.id}`)
        .then(async response => {
            let data = await response.json();
            this.props.addVideoContent(data.results);

            this.setState({progress: data.progress});
            if (data.progress < 100) setTimeout(this.pollServer, 5000);
            else this.setState({searchInProgress: false})
        })
        .catch(e => {
            console.error(e);
            this.setState({searchInProgress: false});
        })
    }

    render() {
        let searchInput = <input className="input-field search-term" type="text" value={this.state.searchTerm} onChange={this.handleSearchChange}/>;
        let durInput = <input className="input-field min-time" type="text" value={this.state.minTime} onChange={this.handleTimeChange}/>;
        let countInput = <input className="input-field count" type="text" value={this.state.count} onChange={this.handleCountChange}/>;
        let websiteInput = <input className="input-field website" type="text" value={this.state.website} onChange={this.handleWebsiteChange}/>;
        let searchBtn = <button className="form-search-btn" onClick={this.handleSubmit}>Search</button>

        if (this.state.searchInProgress) {
            searchInput = <input className="input-field search-term" type="text" value={this.state.searchTerm} onChange={this.handleSearchChange} readOnly/>;
            durInput = <input className="input-field min-time" type="text" value={this.state.minTime} onChange={this.handleTimeChange} readOnly/>;
            countInput = <input className="input-field count" type="text" value={this.state.count} onChange={this.handleCountChange} readOnly/>;
            websiteInput = <input className="input-field website" type="text" value={this.state.website} onChange={this.handleWebsiteChange} readOnly/>;

            searchBtn = <button className="form-search-btn">{this.state.progress + "%"}</button>
        }

        return (
            <div className="Form">
                <div className="form-input">
                    <div className="input-label">Search Term</div>
                    {searchInput}
                </div>
                <div className="form-input">
                    <div className="input-label">Min Dur</div>
                    {durInput}
                </div>
                <div className="form-input">
                    <div className="input-label">Count</div>
                    {countInput}
                </div>
                <div className="form-input">
                    <div className="input-label">Website</div>
                    {websiteInput}
                </div>
                {searchBtn}
            </div>
        )
    }
}