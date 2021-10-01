import ProgressCircleComponent from "./components/Progress";

export const applyCustomCode = externalCodeSetup => {
	const {cssApi, screenHooksApi} = externalCodeSetup;
	cssApi.addCustomColors({headerIconColor: "#fafbfd"});

	screenHooksApi.setProgressCircleComponent(ProgressCircleComponent);
};
