// react
import React, {useState, useReducer, useEffect} from 'react';

// modules

// style
import './App.css';

// components
import Sequencer from './components/sequencer/Sequencer';
import Header from './components/Header';
import TimingController from './components/TimingController';
import Transport from './components/Transport';
import Instruments from './components/Instruments';

// utilities
import {scheduleStep} from './util/scheduling/Scheduler';
import {AC} from './util/audio/AudioContext';
import assignGlobalKeyPress from './util/eventHandlers/assignGlobalKeyPress';
import assignGlobalClick from './util/eventHandlers/assignGlobalClick';
import {useInterval} from './util/useInterval';
import {intervalStartFromStop, intervalStartFromAdjust, intervalScheduleStep} from './util/scheduling/startInterval';
import {clickToggleReducer} from './util/reducers/ClickToggleReducer';
import {playbackReducer} from './util/reducers/PlaybackReducer';
import * as eventsObj from './util/eventHandlers/events';
import './util/specifyBrowser';

// global vars
const globalObj = {
    adjusted: false,
    timeoutComplete: true,
    intervalId: '',
    scheduleList: [],
    notesList: [],
};

// main
export default function App(){
    // destructuring
    const {
        toggleAdvance, togglePause,
    } = eventsObj;

    // states
    // click toggle
    let [toggleState, setToggle] = useReducer(clickToggleReducer, {
        addInstrumentOpen: false,
    });
    // timing states
    let [playbackState, setPlayback] = useReducer(playbackReducer, {
        measure: -1,
        bpm: 128 * 2,
        timeSignature: 4,
        totalSteps: 16,
    });
    const [currentStep, setCurrentStep] = useState(-1);
    const [stopped, setStopped] = useState(true);
    const [playing, setPlaying] = useState(false);
    const [intervalTime, setIntervalTime] = useState(null);
    let [globalBPM, setGlobalBPM] = useState('128');
    let [inputBPM, setInputBPM] = useState(globalBPM);
    let [totalSteps, setTotalSteps] = useState(16);
    let [timeSignature, setTimeSignature] = useState(4);

    // sequencer states
    let [instruments, setInstruments] = useState(Instruments(AC, totalSteps));

    // instruments state
    const InstrumentsListInit = []
    let [instrumentsArr, setInstrumentsArr] = useState(InstrumentsListInit);

    // set all keypress events here
    const bindsObj = {
        ' ': () => togglePause(AC, playing, setPlaying, playbackState, setPlayback, currentStep, globalObj),
        ',': () => toggleAdvance(',', currentStep, AC, playing, playbackState, setCurrentStep, globalObj),
        '.': () => toggleAdvance('.', currentStep, AC, playing, playbackState, setCurrentStep, globalObj),
    }
    assignGlobalKeyPress(bindsObj)
    assignGlobalClick(toggleState, setToggle)
    
    /////////////////// state togglers ///////////////////

    // other init vars for the interval
    let setters = {setCurrentStep, setPlayback};
    const startInterval = () => {
        let getters = {stopped, playbackState, instrumentsArr, globalObj};
        if (stopped && globalObj['adjusted'] === false){
            intervalStartFromStop(AC.currentTime, playbackState, setPlayback, getters, globalObj, setters, setStopped)
        } else if (globalObj['adjusted'] && globalObj['timeoutComplete']) {
            intervalStartFromAdjust(AC.currentTime, getters, currentStep, playbackState, globalObj, setters, stopped, setStopped)
        } else if (currentStep >= 0){
            intervalScheduleStep(getters, currentStep, playbackState, AC.currentTime, intervalTime, setPlayback, globalObj, setters)
        }
    }

    //////////////////////////////////////////// HOOKS ////////////////////////////////////////////
    // set the interval
    useInterval(startInterval, intervalTime)

    // events after step changes
    useEffect(() => {
        if (globalObj['intervalId'] !== '') {
            clearInterval(globalObj['intervalId']);
            globalObj['intervalId'] = '';
        }
        if (playing) {
            AC.resume();
            setIntervalTime(12);
        } else {
            AC.suspend();
            setIntervalTime(null);
        }
    }, [playing])
    
    return (
        <div className="App">
            <Header />
            <Transport togglePause={togglePause} playing={playing} />
            <TimingController bpmObj={{globalBPM, setGlobalBPM, inputBPM, setInputBPM}} stepObj={{totalSteps, currentStep}} />
            <Sequencer instruments={instruments} setInstruments={setInstruments} timing={{globalBPM, currentStep, timeSignature}} />
        </div>
    );
}