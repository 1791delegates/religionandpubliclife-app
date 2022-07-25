// @flow
import React from "react";

import {
	Text,
	View,
	StyleSheet,
	Keyboard,
	Linking,
	Platform,
	KeyboardAvoidingView
} from "react-native";

import type {RegisterParams, User} from "@src/services/api";

import {connect} from "react-redux";
import PropTypes from "prop-types";
import {
	globalStyle,
	GUTTER,
	NAV_HEIGHT,
	BARHEIGHT,
	DEVICE_WIDTH,
	DEVICE_HEIGHT,
	LIST_HEADER_BG,
	correctBottomSafeArea
} from "@src/styles/global";
import {
	signupRequested,
	signupVerificationRequested
} from "@src/actions/singup";
import FormWrapper from "@src/components/FormWrapper";
import {sourceFromConfigImage} from "@src/utils/CCDataUtil";

import IconButton from "@src/components/IconButton";
import Alert from "@src/components/AppAlert";
import {withTranslation} from "react-i18next";
import {NavigationActions} from "react-navigation";
import {isPlatformDisabled} from "@src/utils";
import {authDeeplinkNavigate} from "@src/utils/navigationActions";
import {getExternalCodeSetup} from "@src/externalCode/externalRepo";
import {
	isCodeVerificationEnabled,
	whenToBuyOnRegister,
	REGISTER_FLOW
} from "@src/reducers/settings";
import FastImage from "react-native-fast-image";
import SignupForm from "@src/components/Signup/SignupForm";
import {formFieldToViewModel} from "@src/utils/forms";
import ScrollHeader from "@src/components/ScrollHeader";
import Animated, {event, sub, add, Value} from "react-native-reanimated";
import AnimatedListHeader from "@src/components/AnimatedListHeader";
import {isFeatureEnabled} from "@src/reducers/featureStatuses";
import {inverse} from "@src/utils/animations";
import {ModalBgState} from "@src/services/enums/modalBg";
import CardModalBG from "@src/components/CardModalBG";
import {UserAgreementContentCode} from "@src/services/types/settings";
import {getPlatformSettings, Settings} from "@src/reducers/config";
import {LEGAL_AGREEMENT_KEY} from "@src/reducers/signupFields";
import {UserAgreementModal} from "@src/components/Auth/UserAgreementModal";
import {UserAgreementText} from "@src/components/Auth/UserAgreementText";
import {withSafeAreaInsets} from "react-native-safe-area-context";
import AppImage from "@src/components/AppImage";
import ProfileAvatarUpload from "../components/ProfileAvatarUpload";
import {getApi} from "@src/services/index";
import {
	removeReadyPurchase,
	purchaseAndRegister
} from "@src/actions/inAppPurchases";

type State = {
	footerVisible: boolean,
	disableButton: boolean
};

class SignupScreen extends React.Component {
	state: State;
	_timeoutId: number;
	_keyboardDidShowListener: any;
	_keyboardDidHideListener: any;
	_keyboardDidShow: any;
	_keyboardDidHide: any;
	static navigationOptions: Object;

	constructor(props) {
		super(props);

		this.scrollViewRef = React.createRef();
		this.state = {
			agreementChecked: false,
			animatedHeaderPaddingTopAndroid: 0,
			footerVisible: false,
			disableButton: false,
			modalState: ModalBgState.closed,
			modalContent: null,
			modalHeader: null,
			productsCount: null,
			avatar: null,
			avatarData: null,
			avatarError: false,
			loading: false
		};
	}

	setProductsCount = productsCount => this.setState({productsCount});

	componentDidMount() {
		this._keyboardDidShowListener = Keyboard.addListener(
			"keyboardDidShow",
			this._keyboardDidShow
		);
		this._keyboardDidHideListener = Keyboard.addListener(
			"keyboardDidHide",
			this._keyboardDidHide
		);

		const isPlfDisabled = isPlatformDisabled(this.props.settings);

		if (isPlfDisabled === false) {
			// check if we come form logout
			if (!this.props.auth.cameFromLogout) {
				// on fresh app start run this:
				Linking.getInitialURL().then(url => {
					authDeeplinkNavigate(url, this.props.navigation);
				});
			}
			Linking.addEventListener("url", this.handleOpenURL);
		}
	}

	componentWillUnmount() {
		this._keyboardDidShowListener.remove();
		this._keyboardDidHideListener.remove();

		clearTimeout(this._timeoutId);

		Linking.removeEventListener("url", this.handleOpenURL);
		if (this.props.whenToBuyOnRegister === REGISTER_FLOW.DURING) {
			this.props.removeReadyPurchase();
		}
	}

	handleOpenURL = event => {
		authDeeplinkNavigate(event.url, this.props.navigation);
	};

	getShouldValidate = () =>
		(this.props.whenToBuyOnRegister &&
			this.props.whenToBuyOnRegister !== REGISTER_FLOW.DURING) ||
		(this.props.whenToBuyOnRegister === REGISTER_FLOW.DURING &&
			this.state.productsCount > 1);

	_signup = ({
		data,
		signupEmail
	}: {
		data: RegisterParams,
		signupEmail: string
	}) => {
		if (getExternalCodeSetup().appInitialisationApi.sandboxEnabled) {
			return Alert.alert(
				this.props.t("common:sandbox_sign_up_alert_title"),
				this.props.t("common:sandbox_sign_up_alert_message")
			);
		}
		if (
			this.props.signup.isFetching ||
			this.state.disableButton ||
			this.state.loading
		) {
			return false;
		}
		if (!this.state.avatar) {
			this.setState({avatarError: true});
			Alert.alert("", "Required: Profile Headshot");
			return false;
		}
		if (this.props.withUserAgreementCheckbox) {
			data.append(LEGAL_AGREEMENT_KEY, this.state.agreementChecked);
		}

		// screenProps.authModal.hideModal()

		this.setState({loading: true, avatarError: false});
		let {config, t} = this.props;
		let api = getApi(config);
		const avatarData = new FormData();
		avatarData.append("avatar", {
			uri: this.state.avatarData.path,
			type: this.state.avatarData.mime,
			name: this.state.avatarData.filename
		});
		api
			.requestPostMultipart(
				`wp-json/buddyboss/religion/v1/profile-photo-upload`,
				avatarData,
				null,
				null
			)
			.then(r => {
				data.append("avatar", r.data?.avatar_path);
				data.append("avatar_url", r.data?.avatar_url);
				if (this.getShouldValidate()) {
					this.props.signupVerificationRequested(
						data,
						signupEmail,
						this.props.whenToBuyOnRegister
					);
					return true;
				} else if (
					this.props.whenToBuyOnRegister === REGISTER_FLOW.DURING &&
					this.state.productsCount === 1
				) {
					this.props.purchaseAndRegister(data, signupEmail);
					return true;
				} else {
					this.props.signupRequested(data);
				}
				this.setState({loading: false});
			});
		// else {
		// 	this.props.signupRequested(data);
		// }
	};

	_keyboardDidShow = () => {
		this.setState({footerVisible: true});
	};

	_keyboardDidHide = () => {
		this.setState({footerVisible: false});
	};

	componentWillReceiveProps(nextProps) {
		if (
			this.props.signup.signupData === null &&
			nextProps.signup.signupData !== null
		) {
			nextProps?.screenProps?.authModal &&
				nextProps.screenProps.authModal.hideModal();

			return true;
		}

		if (this.props.signup !== nextProps.signup) {
			const {t, isVerificationEnabled} = this.props;
			const isPlfDisabled = isPlatformDisabled(this.props.settings);
			const isbbRegistration = isVerificationEnabled && isPlfDisabled === false;

			if (nextProps.signup.errorCode || nextProps.signup.user?.data?.code) {
				Alert.alert(
					t("signup:failModalTitle"),
					t(
						"signup:" +
							(typeof nextProps.signup.errorCode === "string"
								? nextProps.signup.errorCode
								: typeof nextProps.signup.errorCode === "object"
									? nextProps.signup.errorCode?.[
											Object.keys(nextProps.signup.errorCode)[0]
									  ]
									: nextProps.signup.user?.data?.message)
					),
					[
						{
							text: t("signup:failModalOk"),
							onPress: () => console.log("OK Pressed!")
						}
					]
				);
			} else if (nextProps.signup.user) {
				this.setState({disableButton: true});

				if (nextProps.signup.signupData === null) {
					Alert.alert(
						t("signup:successModalTitle"),
						t("signup:successModalText"),
						[
							{
								text: t("signup:successModalOk"),
								onPress: () => {
									if (isVerificationEnabled && isPlfDisabled === false) {
										this.props.navigation.dispatch(
											NavigationActions.navigate({
												routeName: "CodeVerificationScreen",
												params: {
													code: "",
													email: isPlatformDisabled(nextProps.settings)
														? nextProps.signup.user.data.email
														: nextProps.signup.user.data.data.user_email
												}
											})
										);
									} else {
										this.props.navigation.dispatch(NavigationActions.back());
									}
								}
							}
						]
					);
				}
			}
		}
	}

	scrollY = new Value(-NAV_HEIGHT);
	// Adjusts scroll on ios to compensate for contentInset
	adjustedScroll = Platform.select({
		ios: sub(this.scrollY, -NAV_HEIGHT),
		android: this.scrollY
	});
	onScroll = event([{nativeEvent: {contentOffset: {y: this.scrollY}}}]);
	headerTranslateY = inverse(this.adjustedScroll);

	handleLinkPress = (contentCode: UserAgreementContentCode, content: any) => {
		if (this.props.screenProps.authModal) {
			this.props.navigation.navigate("UserAgreementScreen", {
				url: this.props[contentCode]?.link
			});
		} else {
			this.showModal(contentCode, content);
		}
	};

	showModal = (headerTextCode, modalContent) => {
		this.setState(
			{
				modalState: ModalBgState.open,
				modalContent,
				modalHeader: this.props.t(`common:${headerTextCode}`)
			},
			this.modal?.open
		);
	};

	hideModal = () => {
		this.modal?.close();
	};

	onClosed = () => {
		this.setState({
			modalState: ModalBgState.closed,
			modalContent: null,
			modalHeader: null
		});
	};

	onAgreementChecked = isChecked =>
		this.setState({agreementChecked: isChecked});

	setAvatar = image => {
		if (
			image.mime === "image/jpeg" ||
			image.mime === "image/png" ||
			image.mime === "image/gif"
		) {
			this.setState({
				avatar: image.path,
				avatarData: image,
				avatarError: false
			});
		} else {
			alert("You have selected an invalid image file type");
		}
	};

	render() {
		const {
			t,
			config,
			signup,
			signupFields,
			signupFieldsLoading,
			navigation,
			isFeatureEnabled,
			screenProps,
			privacyPolicy,
			termsOfService,
			withUserAgreementCheckbox,
			whenToBuyOnRegister,
			readyForPurchasing
		} = this.props;

		const {global, colors, calcFontSize} = globalStyle(config.styles);

		const {
			customColors,
			auth: {style: externalCoreAuthStyle}
		} = getExternalCodeSetup().cssApi;

		const authDarkStyle =
			(externalCoreAuthStyle || config.styles?.auth?.style) !== "light-content";

		const authBg = customColors.regBg || colors.regBg;
		const authTextColor = colors.regTextColor;

		let title = t("signup:pageTitle");

		if (
			whenToBuyOnRegister === REGISTER_FLOW.AFTER ||
			whenToBuyOnRegister === REGISTER_FLOW.BEFORE
		) {
			title = t("signup:accountDetails");
		}

		let bgsource = sourceFromConfigImage(config.login_background_img);

		return (
			<View
				style={{
					flex: 1,
					backgroundColor:
						this.state.modalState === ModalBgState.closed
							? authBg
							: screenProps.authModal
								? LIST_HEADER_BG
								: "#000"
				}}
			>
				{this.state.modalState === ModalBgState.closed &&
					screenProps.authModal &&
					screenProps.authModal.renderCloseButton(
						Platform.select({
							ios: {top: 18},
							android: {top: 14}
						})
					)}

				<CardModalBG modalState={this.state.modalState}>
					<View
						style={[
							styles.main,
							{backgroundColor: authBg},
							screenProps.authModal &&
								Platform.select({
									ios: {
										marginTop:
											-BARHEIGHT + screenProps.authModal.closeButtonTopOffset
									},
									android: {marginTop: 0}
								})
						]}
					>
						{bgsource ? (
							<AppImage
								style={{
									flex: 1,
									position: "absolute",
									top: 0,
									bottom: 0,
									left: 0,
									right: 0,
									width: "100%",
									height: "100%",
									resizeMode: "cover"
								}}
								source={bgsource}
							/>
						) : null}

						{/*this view is added to make the screen title appear in the
							vertical center of the header*/
						screenProps.authModal && (
							<View style={{height: Platform.select({ios: 8, android: 4})}} />
						)}

						<KeyboardAvoidingView
							enabled
							behavior={"padding"}
							style={{
								height: DEVICE_HEIGHT,
								paddingTop:
									whenToBuyOnRegister === REGISTER_FLOW.BEFORE ? 0 : NAV_HEIGHT
							}}
							showsVerticalScrollIndicator={false}
						>
							<FormWrapper
								disableScrollReset
								contentContainerStyle={[
									Platform.select({
										android: {
											paddingBottom: this.state.footerVisible
												? NAV_HEIGHT +
												  correctBottomSafeArea(this.props.insets.bottom) +
												  GUTTER
												: NAV_HEIGHT +
												  correctBottomSafeArea(this.props.insets.bottom),
											marginTop: NAV_HEIGHT + GUTTER
										},
										ios: {}
									}),
									screenProps.authModal && {
										paddingBottom: screenProps.authModal.bottomPaddingFix
									}
								]}
								onScrollBeginDrag={() => {
									if (this.state.animatedHeaderPaddingTopAndroid === 0)
										this.setState({
											animatedHeaderPaddingTopAndroid: NAV_HEIGHT
										});
								}}
								innerRef={this.scrollViewRef}
								onScroll={this.onScroll}
								scrollEventThrottle={1}
								contentInset={{top: NAV_HEIGHT}}
								contentOffset={{y: -NAV_HEIGHT}}
							>
								<View
									style={[
										styles.container,
										{
											paddingBottom:
												correctBottomSafeArea(this.props.insets.bottom) + 40,
											paddingTop:
												whenToBuyOnRegister === REGISTER_FLOW.BEFORE ? 15 : 0
										}
									]}
								>
									<View style={{alignItems: "center"}}>
										<ProfileAvatarUpload
											t={t}
											setAvatar={this.setAvatar}
											avatar={this.state.avatar}
											global={global}
											colors={colors}
										/>
									</View>
									{this.state.avatarError ||
										(!this.state.avatar && (
											<View style={styles.errorContainer}>
												<Text style={styles.error}>
													{"Required: Profile Headshot"}
												</Text>
											</View>
										))}
									<SignupForm
										setProductsCount={this.setProductsCount}
										productsCount={this.state.productsCount}
										{...{
											t,
											config,
											whenToBuyOnRegister,
											readyForPurchasing,
											showProducts:
												whenToBuyOnRegister === REGISTER_FLOW.DURING,
											buttonLabel: this.getShouldValidate()
												? t("signup:continue")
												: t("signup:createAccount"),
											authDarkStyle,
											signupFieldsLoading,
											isAgreementChecked: withUserAgreementCheckbox
												? this.state.agreementChecked
												: true,
											signupInProgress: signup.isFetching || this.state.loading,
											signupRequest: this._signup,
											scrollViewRef: this.scrollViewRef,
											renderAgreementComponent: () =>
												withUserAgreementCheckbox &&
												this.renderAgreementText({
													withCheckbox: true,
													t,
													termsOfService,
													privacyPolicy,
													global,
													colors,
													calcFontSize,
													authDarkStyle,
													onPress: this.onAgreementChecked
												}),
											signupFields: getExternalCodeSetup().authApi.filterSignUpInputs(
												signupFields.map(formFieldToViewModel)
											),
											renderSignupScreenAfterInputs: () =>
												typeof getExternalCodeSetup().authApi
													.renderSignUpScreenAfterInputs === "function" &&
												getExternalCodeSetup().authApi.renderSignUpScreenAfterInputs(
													this.props
												)
										}}
									/>

									{!withUserAgreementCheckbox &&
										this.renderAgreementText({
											withCheckbox: false,
											t,
											termsOfService,
											privacyPolicy,
											global,
											colors,
											calcFontSize,
											authDarkStyle
										})}
								</View>
							</FormWrapper>
						</KeyboardAvoidingView>
						{whenToBuyOnRegister !== REGISTER_FLOW.BEFORE && (
							<Animated.View
								style={[
									{
										marginHorizontal: 20,
										paddingTop: NAV_HEIGHT,
										transform: [
											{
												translateY: add(
													this.headerTranslateY,
													screenProps.authModal ? 10 : 0
												)
											}
										],
										position: "absolute",
										width: DEVICE_WIDTH
									}
								]}
							>
								<AnimatedListHeader
									title={title}
									global={global}
									scrollY={this.adjustedScroll}
									style={{flex: 1}}
									titleStyle={{color: authTextColor}}
									authWrapperProps={{actionOnGuestLogin: "hide"}}
								/>
							</Animated.View>
						)}
						<ScrollHeader
							screenProps={{
								global,
								colors: {
									...colors,
									headerIconColor:
										config.styles?.auth?.style !== "light-content"
											? "rgba(255,255,255,1)"
											: colors.headerIconColor,
									headerBg: authBg
								},
								t,
								isFeatureEnabled
							}}
							backgroundSource={bgsource}
							navigation={navigation}
							screenTitle={title}
							scrollY={this.adjustedScroll}
							disableBlur={true}
							disableContentAnimation={
								whenToBuyOnRegister === REGISTER_FLOW.BEFORE
							}
							headerBgColor={"transparent"}
							headerTitleStyle={{color: authTextColor}}
							headerProps={{
								getHeaderLeft: () => (
									<IconButton
										icon={require("@src/assets/img/arrow-back.png")}
										webIcon={"IconArrowBack"}
										pressHandler={() => {
											const backAction = NavigationActions.back();
											navigation.dispatch(backAction);
										}}
										tintColor={authTextColor}
										style={{
											width: 24,
											height: 18
										}}
										hitSlop={{top: 10, bottom: 10, right: 10, left: 10}}
									/>
								)
							}}
						/>
					</View>
				</CardModalBG>
				{this.renderUserAgreementModal()}
			</View>
		);
	}

	renderUserAgreementModal = () => {
		const {config} = this.props;
		const {modalContent, modalHeader} = this.state;
		return (
			<UserAgreementModal
				{...{
					config,
					modalContent,
					modalHeader,
					onClosed: this.onClosed,
					ref: ref => (this.modal = ref),
					hideModal: this.hideModal,
					headerStyle: this.props.screenProps.authModal && {marginTop: 20}
				}}
			/>
		);
	};

	renderAgreementText = ({
		withCheckbox = false,
		t,
		termsOfService,
		privacyPolicy,
		global,
		colors
	}) => {
		return (
			<UserAgreementText
				{...{
					register: true,
					colors,
					global,
					t,
					termsOfService,
					privacyPolicy,
					withCheckbox,
					onPress: this.handleLinkPress,
					onAgreementChecked: this.onAgreementChecked,
					agreementChecked: this.state.agreementChecked
				}}
			/>
		);
	};
}

SignupScreen.propTypes = {
	config: PropTypes.object.isRequired,
	signup: PropTypes.object.isRequired,
	signupFields: PropTypes.arrayOf(PropTypes.object).isRequired,
	auth: PropTypes.object.isRequired,
	navigation: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
	whenToBuyOnRegister: whenToBuyOnRegister(state),
	readyForPurchasing: state.inAppPurchases.purchasing.readyForPurchasing,
	settings: state.settings.settings,
	withUserAgreementCheckbox: getPlatformSettings(state)[
		Settings.REGISTER_LEGAL_AGREEMENT
	],
	config: state.config,
	auth: state.auth,
	signup: state.signup,
	signupFieldsLoading: state.signupFields.loading,
	signupFields: state.signupFields.data.filter(
		({id}) => id !== LEGAL_AGREEMENT_KEY
	), // excluding the legal agreement key as it is handled in the app
	termsOfService: state.settings.termsOfService,
	privacyPolicy: state.settings.privacyPolicy,
	isVerificationEnabled: isCodeVerificationEnabled(state) === true,
	isFeatureEnabled: isFeatureEnabled(state)
});

const {addBackHandling} = require("@src/containers/ContainerHelpers");

SignupScreen = withTranslation("signup")(withSafeAreaInsets(SignupScreen));

let ConnectScreen = connect(
	mapStateToProps,
	{
		removeReadyPurchase,
		signupRequested,
		signupVerificationRequested,
		purchaseAndRegister
	}
)(SignupScreen);

let SignupScreen_ = addBackHandling(
	ConnectScreen,
	(component: ConnectScreen, props: any): boolean => {
		props.navigation.goBack();
		return true;
	}
);

SignupScreen_.navigationOptions = {header: null};

export default SignupScreen_;

/**
 * Style Variables
 */

const styles = StyleSheet.create({
	main: {
		flex: 1
	},
	container: {
		paddingHorizontal: 20
	},
	form: {},
	fakeSpinner: {
		width: 10,
		height: 20
	},
	button: {
		marginTop: 17
	},
	spinner: {
		marginRight: -15,
		marginLeft: 5
	},
	modalHeaderContainer: {
		backgroundColor: LIST_HEADER_BG,
		minHeight: 54,
		justifyContent: "space-between",
		padding: 16,
		borderTopRightRadius: 12,
		borderTopLeftRadius: 12
	},
	userAgreementContainer: {
		flex: 1,
		padding: 20,
		borderRadius: 12
	},
	errorContainer: {
		justifyContent: "center",
		alignItems: "center"
	},
	error: {
		color: "#fff",
		marginBottom: 14,
		fontFamily: "Lato",
		fontWeight: "400"
	}
});
