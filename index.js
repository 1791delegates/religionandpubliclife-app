import React from "react";
import {View, StyleSheet, Text} from "react-native";
import {isColorDark} from "@src/utils";
import Icon from "@src/components/Icon";
import ProgressCircleComponent from "./components/Progress";
import ParagraphBlock from "./components/ParagraphBlock";
import TopicsSingleScreen from "./containers/TopicsSingleScreen";
import SignupScreen from "./containers/SignupScreen";
import {NativeModules} from "react-native";
const {RNCustomCode} = NativeModules;
import {
	initialize,
	BlockliBlog,
	BlockliFeatured,
	BlockliGraphics,
	BlockliPost,
	BlockliVideo
} from "@blocklienterprise/blockli";
import config from "@src/build_config.json";

export const applyCustomCode = async externalCodeSetup => {
	const {
		cssApi,
		screenHooksApi,
		blocksApi,
		settingsScreenApi,
		profileScreenHooksApi,
		socialGroupSingleApi,
		navigationApi,
		reduxApi,
		lessonSingleScreenApi
	} = externalCodeSetup;

	await initialize("Q6DZ51BCJAT9VAK", config.app_id);

	//blocksApi.addCustomBlockRender("blockli/blog-cards", (props) => (
	// <BlockliBlog {...props} />
	//));

	blocksApi.addCustomBlockRender("blockli/featured-cards", (props) => (
	<BlockliFeatured {...props} />
	));

	blocksApi.addCustomBlockRender("blockli/graphic-cards", props => (
		<BlockliGraphics {...props} />
	));

	blocksApi.addCustomBlockRender("blockli/video-cards", props => (
		<BlockliVideo {...props} />
	));

	blocksApi.addCustomBlockRender("blockli/post-cards", props => (
		<BlockliPost {...props} />
	));

	cssApi.addCustomColors({headerIconColor: "#fafbfd"});
	cssApi.addCustomColors({warningColor: "#8C0087"});
	cssApi.addGlobalStyle(
		"inputDesc",
		{
			color: "#fff",
			fontFamily: "Lato-Regular",
			fontSize: 10,
			fontStyle: "normal",
			fontWeight: "400"
		},
		true
	);

	screenHooksApi.setProgressCircleComponent(ProgressCircleComponent);
	blocksApi.addCustomBlockRender("core/paragraph", props => (
		<ParagraphBlock {...props} />
	));

	const customIconFilter = (key, defaultIcon) => {
		switch (key) {
			case "login":
				return require("./assets/LoginInformation.png");
			case "push":
				return require("./assets/PushNotifications.png");
			case "email":
				return require("./assets/EmailPreferences.png");
			case "privacy":
				return require("./assets/PrivacySettings.png");
			case "block":
				return require("./assets/BlockedUsers.png");
			case "group":
				return require("./assets/ClubInvites.png");
			case "export":
				return require("./assets/ExportData.png");
			case "about":
				return require("./assets/About.png");
			case "feedback":
				return require("./assets/SendUsFeedback.png");
			case "bug":
				return require("./assets/ReportaBug.png");
			case "rating":
				return require("./assets/RatethisApp.png");
			case "xprofile":
				return require("./assets/Profile.png");
			case "friends":
				return require("./assets/Colleagues.png");
			case "courses":
				return require("./assets/Courses.png");
			case "club":
				return require("./assets/Clubs.png");
			case "videos":
				return require("./assets/Videos.png");
			case "Feed":
				return require("./assets/Feed.png");
			case "Members":
				return require("./assets/Members.png");
			case "Discussions":
				return require("./assets/Discussions.png");
			case "Documents":
				return require("./assets/Documents.png");
			case "Photos":
				return require("./assets/Photos.png");
			case "Send Invites":
				return require("./assets/SendInvites.png");
			case "Manage":
				return require("./assets/Manage.png");
			case "Videos":
				return require("./assets/Videos.png");
			default:
				return defaultIcon;
		}
	};
	settingsScreenApi.setSettingsListFilter((Tabs, props) => {
		return Tabs.map(Tab => {
			return {...Tab, icon: customIconFilter(Tab.key, Tab.icon)};
		});
	});

	profileScreenHooksApi.setTabsList((list, navigation, user, isOwnAccount) => {
		return list.map(Tab => {
			return {...Tab, icon: customIconFilter(Tab.id, Tab.icon)};
		});
	});

	socialGroupSingleApi.setTabFilter(props => {
		return props.map(Tab => {
			return {...Tab, icon: customIconFilter(Tab.label, Tab.icon)};
		});
	});

	navigationApi.addNavigationRoute(
		"TopicsSingleScreen",
		"TopicsSingleScreen",
		TopicsSingleScreen,
		"All"
	);

	navigationApi.addNavigationRoute(
		"SignupScreen",
		"SignupScreen",
		SignupScreen,
		"Auth"
	);
	lessonSingleScreenApi.setTransformLessonActionButtons(
		(
			LessonActionBtn,
			showComplete,
			global,
			colors,
			lesson,
			completing,
			labels
		) => {
			return lesson.completed ? (
				<View
					style={[
						global.row,
						{
							zIndex: 1,
							paddingHorizontal: 15,
							paddingVertical: 15,
							backgroundColor: colors.bodyFrontBg,
							borderTopColor: colors.borderColor,
							borderTopWidth: StyleSheet.hairlineWidth
						}
					]}
				>
					<View
						style={[
							global.completeLessonButtonW,
							{flex: 1},
							{
								backgroundColor: colors.bodyFrontBg
							}
						]}
					>
						<View style={global.row}>
							<View style={global.linkWithArrow}>
								<Icon
									webIcon={""}
									icon={require("./assets/completed-course.png")}
									styles={{width: 36, height: 36}}
								/>

								<Text
									style={[
										global.completeButton,
										{
											marginLeft: 10,
											color: isColorDark(colors.bodyFrontBg) ? "white" : "black"
										}
									]}
								>
									{"Completed"}
								</Text>
							</View>
						</View>
					</View>
				</View>
			) : (
				LessonActionBtn
			);
		}
	);
};
