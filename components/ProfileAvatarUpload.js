import React from "react";
import {
	Alert,
	View,
	StyleSheet,
	Animated,
	ActivityIndicator
} from "react-native";
import ImagePicker from "react-native-image-crop-picker";
const ActionSheet = require("@yfuks/react-native-action-sheet").default;
import {connect} from "react-redux";
import {profileImageRequested} from "@src/actions/profileUserPhotos";
import AppAvatar from "@src/components/AppAvatar";
import AppTouchableWithoutFeedback from "@src/components/AppTouchableWithoutFeedback";

type Props = {avatar: any, setAvatar: Function, t: Function};

export default class ProfileAvatarUpload extends React.Component<Props> {
	_pickImage = () => {
		ImagePicker.openPicker({
			compressImageMaxWidth: 1200,
			compressImageMaxHeight: 1200,
			compressImageQuality: 0.6
		})
			.then(image => {
				this.props.setAvatar(image);
			})
			.catch(error => {
				if (error.code !== "E_PICKER_CANCELLED")
					Alert.alert(
						this.props.t("newReply:bbMediaErrorTitle"),
						this.props.t("newReply:bbMediaErrorMessage")
					);
			});
	};

	_onOpenImageActions = () => {
		const CANCEL_INDEX = 1;

		ActionSheet.showActionSheetWithOptions(
			{
				title: "Upload a new profile image",
				options: ["Photos Library", "Cancel"],
				cancelButtonIndex: CANCEL_INDEX
			},
			buttonIndex => {
				if (buttonIndex === 0) {
					this._pickImage();
				}
			}
		);
	};

	render() {
		const {global, avatar} = this.props;
		const AvatarWrapper = AppTouchableWithoutFeedback;
		return (
			<AvatarWrapper onPress={this._onOpenImageActions}>
				<Animated.View>
					<View style={{justifyContent: "center"}}>
						<AppAvatar
							key={"1"}
							style={styles.profileHeaderAvatar}
							size={85}
							source={avatar ? {uri: avatar} : require("../assets/Avatar.png")}
						/>
					</View>
				</Animated.View>
			</AvatarWrapper>
		);
	}
}

const styles = StyleSheet.create({
	profileHeaderAvatar: {
		marginBottom: 8,
		marginTop: "auto"
	}
});
