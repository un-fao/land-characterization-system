import React, { useReducer, useEffect } from "react";
import JoyRide, { ACTIONS, EVENTS, STATUS } from "react-joyride";

const TOUR_STEPS = [
  {
    target: ".guide-menu",
    content: "Menu bar with all functions.",
    disableBeacon: true // This makes the tour to start automatically without clicking
  },
  {
    target: ".guide-subMenu",
    content: "Short cut functions."    
  },
  {
    target: ".guide-LCMLElements",
    content: "The full list of LCML elements.  Double click on an element to add it to your legend."
  },
  {
    target: ".guide-myLegend",
    content: "Tree representation of your legend.  Click on the items to edit."
  },
  {
    target: ".guide-legendDiagram",
    content: "Visual representation of your legend.  Click on the items to edit properties and characteristics below."    
  },
  {
    target: ".guide-properties",
    content: "Manage your legend's element properties here."
  },
  {
    target: ".guide-characteristics",
    content: "Manage your legend's element characteristics here."
  },
  {
    target: ".guide-legendTabs",
    content: "Select legend or class diagrams here."
  },
  {
    target: ".guide-newLegend",
    content: "Click here to create a new legend."
  },
  {
    target: ".guide-importLegend",
    content: "Click here to import a legend."
  },
  {
    target: ".guide-exportLegend",
    content: "Click here to export your legend."
  },
  {
    target: ".guide-manageStorage",
    content: "Save and manage your progress here."
  },
  {
    target: ".guide-validateLegend",
    content: "Click here to validate your legend."
  },
  {
    target: ".guide-legendWizard",
    content: "Click here to build your legend step by step."
  },
  {
    target: ".guide-userDefinition",
    content: "Define your own characteristics here."
  },
  {
    target: ".guide-docs",
    content: "LChS documentation."
  }
];

const INITIAL_STATE = {
  key: new Date(), // This field makes the tour to re-render when we restart the tour
  run: false,
  continuous: true,
  loading: false,
  stepIndex: 0,
  steps: TOUR_STEPS
};

// Reducer will manage updating the local state
const reducer = (state = INITIAL_STATE, action) => {
  switch (action.type) {
    case "START":
      return { ...state, run: true };
    case "RESET":
      return { ...state, stepIndex: 0 };
    case "STOP":
      return { ...state, run: false };
    case "NEXT_OR_PREV":
      return { ...state, ...action.payload };
    case "RESTART":
      return {
        ...state,
        stepIndex: 0,
        run: true,
        loading: false,
        key: new Date()
      };
    default:
      return state;
  }
};

// Tour component
export const Guide = (props) => {
  const { setGuideVisible } = props;
  // Tour state is the state which control the JoyRide component
  const [tourState, dispatch] = useReducer(reducer, INITIAL_STATE);

  useEffect(() => {
    // Auto start the tour if the tour is not viewed before
    if (!localStorage.getItem("tour")) {
      dispatch({ type: "START" });
    }    
  }, []);

  // Set once tour is viewed, skipped or closed
  const setTourViewed = () => {
    // localStorage.setItem("tour", "1");
    setGuideVisible(false);
  };

  const callback = data => {
    const { action, index, type, status } = data;

    if (
      // If close button clicked, then close the tour
      action === ACTIONS.CLOSE ||
      // If skipped or end tour, then close the tour
      (status === STATUS.SKIPPED && tourState.run) ||
      status === STATUS.FINISHED
    ) {
      setTourViewed();
      dispatch({ type: "STOP" });
    } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      // Check whether next or back button click and update the step.
      dispatch({
        type: "NEXT_OR_PREV",
        payload: { stepIndex: index + (action === ACTIONS.PREV ? -1 : 1) }
      });
    }
  };

  const startTour = () => {
    // Start the tour manually
    dispatch({ type: "RESTART" });
  };

  return (
      <JoyRide
        {...tourState}
        callback={callback}
        showSkipButton={true}
        styles={{
          tooltipContainer: {
            textAlign: "left"
          },
          buttonBack: {
            marginRight: 10
          }
        }}
        locale={{
          last: "End tour"
        }}
      />
  );
};


  