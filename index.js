import React from "react";
import ProgressCircleComponent from "./components/Progress";
import ParagraphBlock from "./components/ParagraphBlock";

export const applyCustomCode = externalCodeSetup => {
	const {cssApi, screenHooksApi, blocksApi} = externalCodeSetup;
	cssApi.addCustomColors({headerIconColor: "#fafbfd"});
	screenHooksApi.setProgressCircleComponent(ProgressCircleComponent);
	blocksApi.addCustomBlockRender("core/paragraph", props => (
		<ParagraphBlock {...props} />
	));
};
