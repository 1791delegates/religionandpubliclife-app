import React from "react";
import ProgressCircleComponent from "./components/Progress";
import ParagraphBlock from "./components/ParagraphBlock";
import TopicsSingleScreen from "./containers/TopicsSingleScreen";

export const applyCustomCode = externalCodeSetup => {
	const {
		cssApi,
		screenHooksApi,
		blocksApi,
		settingsScreenApi,
		profileScreenHooksApi,
		socialGroupSingleApi,
		navigationApi
	} = externalCodeSetup;

	cssApi.addCustomColors({headerIconColor: "#fafbfd"});
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
};
