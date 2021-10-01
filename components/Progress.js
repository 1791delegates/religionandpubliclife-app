//@flow

import React from "react";
import {View} from "react-native";
import ProgressCircle from "react-native-progress/Circle";
import Icon from "@src/components/Icon";

type Props = {
	isCompleted?: boolean,
	progress?: string,
	colors: any,
	size: number,
	thickness?: number,
	unfilledColor?: string,
	progressColor?: string
};

const Progress = (props: Props) => {
	const {
		isCompleted,
		progress,
		colors,
		size,
		thickness,
		unfilledColor,
		progressColor,
		checkIcon
	} = props;

	if (isCompleted)
		return checkIcon ? (
			checkIcon
		) : (
			<Icon
				webIcon={"IconAndroidGroup"}
				styles={{width: size + 2, height: size + 2}}
				tintColor={"#045EA7"}
				icon={require("@src/assets/img/check.png")}
				rtlStyleFix={"handled"}
			/>
		);

	return (
		<ProgressCircle
			size={size}
			progress={progress / 100}
			thickness={thickness}
			unfilledColor={unfilledColor || colors.bodyBg}
			animated={true}
			borderWidth={0}
			color={progressColor || colors.highlightColor}
		/>
	);
};

Progress.defaultProps = {
	size: 20,
	thickness: 1.5
};

export default Progress;
