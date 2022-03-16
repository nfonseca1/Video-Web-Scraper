import React from 'react';
import { v4 as uuidv4 } from 'uuid';

class BatchForm extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            separator: "LB",
            searchTerms: "",
            duration: "",
            count: "1",
            website: ""

        }

        this.setSeparator = this.setSeparator.bind(this);
        this.handleSearchChange = this.handleSearchChange.bind(this);
        this.handleDurationChange = this.handleDurationChange.bind(this);
        this.handleCountChange = this.handleCountChange.bind(this);
        this.handleWebsiteChange = this.handleWebsiteChange.bind(this);
        this.addBatchSearches = this.addBatchSearches.bind(this);
    }

    setSeparator(sep) {
        this.setState({ separator: sep })
    }

    handleSearchChange(event) {
        this.setState({ searchTerms: event.target.value });
    }

    handleDurationChange(event) {
        this.setState({ duration: event.target.value });
    }

    handleCountChange(event) {
        this.setState({ count: event.target.value });
    }

    handleWebsiteChange(event) {
        this.setState({ website: event.target.value });
    }

    addBatchSearches() {
        let splitter = this.state.separator;
        if (this.state.separator === "LB") splitter = "\n";
        
        let searches = this.state.searchTerms.split(splitter);
        searches = searches.filter((val) => val.trim() != "");
        let forms = searches.map((search, idx) => ({
            uuid: uuidv4(),
            search,
            duration: this.state.duration,
            count: this.state.count,
            website: this.state.website
        }))

        this.props.addForms(forms);

        this.props.clearBatch();
    }

    render() {

        let semiButtonClass = "option-button" + (this.state.separator === ";" ? " selected" : "");
        let periodButtonClass = "option-button" + (this.state.separator === "." ? " selected" : "");
        let lineBreakButtonClass = "option-button" + (this.state.separator === "LB" ? " selected" : "");
        let dashButtonClass = "option-button" + (this.state.separator === "-" ? " selected" : "");

        return (
            <div className="BatchForm">
                <div className="box-background" onClick={this.props.clearBatch}></div>
                <div className="box">
                    <textarea className="text-box" placeholder="Search Terms..." value={this.state.searchTerms} onChange={this.handleSearchChange}></textarea>
                    <div className="options">
                        <div className="option">
                            <div className="option-label">Separator</div>
                            <div className="option-buttons-list">
                                <div className={semiButtonClass} onClick={() => this.setSeparator(";")}>;</div>
                                <div className={periodButtonClass} onClick={() => this.setSeparator(".")}>.</div>
                                <div className={lineBreakButtonClass} onClick={() => this.setSeparator("LB")}>LB</div>
                                <div className={dashButtonClass} onClick={() => this.setSeparator("-")}>-</div>
                            </div>
                        </div>
                        <div className="option">
                            <div className="option-label">Min Dur <span className="optional-label">(Optional)</span></div>
                            <input type="text" className="input-field duration" value={this.state.duration} onChange={this.handleDurationChange}/>
                        </div>
                        <div className="option">
                            <div className="option-label">Count <span className="optional-label">(Optional)</span></div>
                            <input type="text" className="input-field count" value={this.state.count} onChange={this.handleCountChange}/>
                        </div>
                        <div className="option">
                            <div className="option-label">Website <span className="optional-label">(Optional)</span></div>
                            <input type="text" className="input-field website" value={this.state.website} onChange={this.handleWebsiteChange}/>
                        </div>
                    </div>
                    <div className="button-row">
                        <button className="add-new-form-btn" onClick={this.addBatchSearches}>Add Search</button>
                    </div>
                </div>
            </div>
        )
    }
}

export default BatchForm;