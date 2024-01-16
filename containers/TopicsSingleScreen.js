/* @flow weak */

import React, {Component, useRef, useEffect} from "react";
import {bindActionCreators} from "redux";
import {
	View,
	Text,
	StyleSheet,
	ListView,
	Platform,
	WebView,
	ScrollView,
	Linking,
	Dimensions,
	VirtualizedList
} from "react-native";
import {connect} from "react-redux";
import PropTypes from "prop-types";
import {withTranslation} from "react-i18next";
import AppList from "@src/components/AppList";
import ReadMore from "@src/components/ReadMore";
import AppTouchableOpacity from "@src/components/AppTouchableOpacity";
import IconButtonWrapped from "@src/components/IconButtonWrapped";
import IconButton from "@src/components/IconButton";
import ItemHeader from "@src/components/ItemHeader";
import Icon from "@src/components/Icon";
import ReplyItem from "@src/components/ReplyItem";
import {
	globalStyle,
	GUTTER,
	NAV_HEIGHT,
	FontWeights,
	correctBottomSafeArea
} from "@src/styles/global";
import {
	titleTrim,
	shortContent,
	formatDate,
	getAvatar,
	wrapHtml,
	getOrDefault,
	fullContent,
	filterContentCss,
	renderMediaItems,
	shadeColor,
	alterChildrenHTML,
	concatNativeContent,
	topicToViewModel,
	capitalizeString,
	memberToViewModel,
	INITIAL_HEADER_SCROLL,
	stripHTMLTags,
	documentToViewModel,
	elementDomTempering
} from "@src/utils";
import {NavigationActions, withNavigation} from "react-navigation";
import Animated, {sub} from "react-native-reanimated";
// import {hashFunction} from "@src/reducers/config";

import * as SingleTopicActions from "@src/actions/singleTopic";
import {bulkRecourcesByUrlRequest} from "@src/actions/bulkUrls";
import * as TopicsAction from "@src/actions/topics";
import IntercomButton from "@src/components/IntercomButton";
import TrackPlayerControllerMini from "@src/components/TrackPlayerControllerMini";

const DEVICE_WIDTH = Dimensions.get("window").width;
const DEVICE_HEIGHT = Dimensions.get("window").height;
import {PRE_PAGE as replyPageSize} from "@src/epics/singleTopic";
import BlocksList from "@src/components/BlocksList";
import AuthWrapper from "@src/components/AuthWrapper";
import AuthNotice from "@src/components/AuthNotice";
import {getApi} from "@src/services/index";
import {getExternalCodeSetup} from "@src/externalCode/externalRepo";
import ScrollHeader from "@src/components/ScrollHeader";
import PortalScrollableModal from "@src/components/Modals/PortaledScrollableModal";
import BottomSheetHeader from "@src/components/BottomSheet/BottomSheetHeader";
import AppAvatar from "@src/components/AppAvatar";
import ImageCollection from "@src/components/ImageCollection";
import {aTagRenderer, imgRenderer} from "@src/utils/htmlRender";
import EmbeddedDocumentItem from "@src/components/Documents/EmbeddedDocumentItem";
import {compose} from "recompose";
import withProfileNavigation from "@src/components/hocs/withProfileNavigation";
import withReportModal from "@src/components/hocs/withReportModal";
import {mediaUpdateRequest} from "@src/actions/photos";

const THRESHOLD = 0.7;
const ActionSheet = require("@yfuks/react-native-action-sheet").default;

`/********`;
const DELETE_ICON_COLOR = "#8C0087";

const moreOptionsIcons = {
	edit: require("../assets/Edit.png"),
	close: require("../assets/Close.png"),
	stick: require("../assets/Stick.png"),
	superstick: require("../assets/Stick.png"),
	merge: require("../assets/Merge.png"),
	spam: require("../assets/Spam.png"),
	report: require("../assets/Report.png"),
	trash: require("../assets/Trash.png"),
	split: require("../assets/split.png"),
	move: require("../assets/move.png")
};
`********/`;

const ItemHeaderComponent = props => {
	const CustomComponent = getExternalCodeSetup().topicsApi.TopicItemHeader;

	if (getExternalCodeSetup().topicsApi.TopicItemHeader) {
		return <CustomComponent {...props} />;
	}

	return <ItemHeader {...props} />;
};

class TopicsSingleScreen extends Component {
	listRef: *;
	imagesViewPagerRef: *;
	contentSizeInterval: *;
	titleVisible: boolean;

	constructor(props) {
		super(props);

		const {t} = this.props;

		this.state = {
			topicActionsObject: {},
			topicActionsOrder: [],
			showTopicActions: false,
			replyActionsArray: [],
			replyActionsObject: {},
			replyActionsOrder: [],
			showReplyActions: false,
			currentReply: null,
			showImagesModal: false,
			initialImageToShow: 0,
			topic: props.navigation.state.params?.topic || props?.topic
		};

		this.titleVisible = false;
		this.listRef = false;
		this.contentSizeInterval = undefined;
		this.moreOptionsModalRef = React.createRef(null);
		this.replyMoreOptionsModalRef = React.createRef(null);
		this.closedDiscussionModalRef = React.createRef(null);
		this.imagesViewPagerRef = React.createRef();
	}

	scrollToPendingIndex = () => {
		if (this.props.replyListProps.replies) {
			const index = this.props.replyListProps.replies.findIndex(
				this.isReplyPending
			);
			if (index > 0) {
				this.listRef &&
					this.listRef._component?.scrollToIndex &&
					this.listRef._component.scrollToIndex({
						animated: true,
						index,
						viewPosition: 0.5
					});
				setTimeout(() => {
					this.props.navigation.setParams({
						replyId: undefined
					});
					this.forceUpdate();
				}, 4000);
			}
		}
	};

	onScrollToIndexFailed = scrollError => {
		this.listRef._component.scrollToOffset({
			animated: true,
			offset: scrollError.averageItemLength * scrollError.index,
			viewPosition: 0.7
		});

		setTimeout(() => {
			const index = scrollError.index;

			if (index > 0) {
				this.listRef &&
					this.listRef._component?.scrollToIndex &&
					this.listRef._component.scrollToIndex({
						animated: true,
						index,
						viewPosition: 0.5
					});
			}
		}, 100);
	};

	componentWillUnmount() {
		this.props.onExit();
	}

	componentDidUpdate(oldProps) {
		const {singleTopic, currentTopic} = this.props;

		if (
			this.hasPendingReply() &&
			singleTopic.resultForPendingId !== undefined &&
			this.isReplyIdPending(singleTopic.resultForPendingId) &&
			oldProps.singleTopic.resultForPendingId === undefined
		) {
			setTimeout(() => this.scrollToPendingIndex(), 1000);
		}

		if (currentTopic !== oldProps.currentTopic) {
			this.loadInitialReplies();
			this.initTopicOptions();

			// update state after subscription othervise onStart will load old data
			if (
				oldProps.currentTopic &&
				currentTopic.action_states !== oldProps.currentTopic.action_states
			) {
				this.setState({topic: currentTopic}, () => {
					this.onRefresh(currentTopic?.id);
				});
			}
		}

		if (
			oldProps.replyListProps.isRefreshing &&
			!this.props.replyListProps.isRefreshing
		) {
			setTimeout(() => (this.letAnimate = true), 800);
		}

		if (
			!oldProps.singleTopic.trashTopicResult &&
			singleTopic.trashTopicResult
		) {
			this.props.navigation.dispatch(NavigationActions.back());
		}
	}

	componentDidMount() {
		let params = this.props.navigation.state.params;

		if (typeof params !== "object") {
			params = {};
		}

		if ("topic" in params || this.props.topic) {
			setTimeout(() => {
				this.props.navigation.onStartCallback(this._onStart);
				this.props.navigation.onStopCallback(this._onStop);
			}, 0);

			this.loadInitialReplies();
			this.initTopicOptions();

			this.props.navigation.setParams({
				onOpenAction: this._onOpenTopicActions
			});
		} else {
			return this.props.navigation.dispatch(NavigationActions.back());
		}
	}

	loadInitialReplies = () => {
		const {singleTopic, currentTopic} = this.props;

		if (
			singleTopic.lastLoadedReplyPage === 0 &&
			singleTopic.topLastLoadedReplyPage === 0 &&
			!singleTopic.repliesLoadingErrorCode &&
			this.props.online
		) {
			if (this.hasPendingReply()) {
				if (singleTopic.bottomLoadingState === "idle") {
					this.props.replyCallbacks.loadPendingReplyPage(currentTopic);
				}
			} else if (singleTopic.bottomLoadingState === "idle") {
				this.props.replyCallbacks.loadFirst(currentTopic);
			}
		}
	};

	initTopicOptions = () => {
		const {currentTopic, currentUser, t} = this.props;
		const userTopicPermissions = currentTopic.current_user_permissions;

		const topicActionsObject = {};
		let topicActionsOrder = [];

		if (userTopicPermissions.edit) {
			topicActionsObject.edit = t("topic:edit");
			topicActionsOrder.push("edit");
		}

		if (userTopicPermissions.moderate) {
			topicActionsObject.close = !currentTopic.action_states.open
				? t("topic:open")
				: t("topic:close");
			topicActionsObject.stick = !currentTopic.action_states.sticky
				? t("topic:stick")
				: t("topic:unstick");
			topicActionsObject.merge = t("topic:merge");
			topicActionsObject.spam = !currentTopic.action_states.spam
				? t("topic:spam")
				: t("topic:unspam");
			topicActionsOrder = topicActionsOrder.concat([
				"close",
				"stick",
				"merge",
				"spam"
			]);
		}
		const isMine = currentTopic.author === currentUser?.id; // currentUser unavailable during guest login

		if (currentTopic.can_report && !currentTopic.reported) {
			topicActionsObject.report = currentTopic.report_button_text;
			topicActionsOrder.push("report");
		}

		if (userTopicPermissions.trash) {
			topicActionsObject.trash = t("topic:trash");
			topicActionsOrder.push("trash");
		}

		if (
			JSON.stringify(topicActionsObject) !==
			JSON.stringify(this.state.topicActionsObject)
		) {
			this.setState({topicActionsObject, topicActionsOrder}, () => {
				this.props.navigation.setParams({topicActionsOrder});
			});
		}
	};

	getScreenArg = () => {
		return {
			topicId: this.props.currentTopic.id,
			topic: this.props.currentTopic
		};
	};

	_onStart = () => {
		this.props.lifeCycle.onStart(this.getScreenArg());
	};

	_onStop = () => {
		this.props.lifeCycle.onStop(this.getScreenArg());
	};

	handleImagePress = (image, index) => {
		this.setState({initialImageToShow: index});
		requestAnimationFrame(() => {
			this.setState({showImagesModal: true});
		});
	};

	closeImagesModal = () => {
		this.setState({showImagesModal: false});
	};

	extendTopicViewModel = topic => {
		const {t, topicActions, toUserBasedOnSettings} = this.props;
		const viewModel = topicToViewModel(topic, {
			t,
			topicActions,
			toUserBasedOnSettings
		});
		const media = this.props.config.plugins.forum_buddyboss_media
			? topic.bbp_media
			: null;

		const videos = this.props.config.plugins.forum_buddyboss_media
			? topic.bbp_videos
			: null;

		return getExternalCodeSetup().topicsApi.topicToViewModelFilter(
			{
				...viewModel,
				media,
				videos,
				documents: topic.bbp_documents,
				onMediaClick: (media, number) => {
					this.props.topicCallbacks.onMediaClick(topic, number);
				},
				newReply: () => this.props.replyCallbacks.addNewReplyTopicClick(topic),
				favourite: () => this.props.topicCallbacks.favouriteTopicClick(topic)
			},
			topic
		);
	};

	_replyToViewModel = (reply: Reply) => {
		const get = getOrDefault(reply);

		const media = this.props.config.plugins.forum_buddyboss_media
			? get(r => r.bbp_media)
			: null;

		const videos = this.props.config.plugins.forum_buddyboss_media
			? get(r => r.bbp_videos, null)
			: null;

		const userReplyPermissions = reply?.current_user_permissions || {};

		const showActions = Object.keys(userReplyPermissions).some(
			key => userReplyPermissions[key]
		);

		const {t, currentUser} = this.props;

		const isMine = reply.author === currentUser?.id; // currentUser is unavailable during guest login

		return {
			id: reply.id,
			depth: get(t => t.depth),
			isPending: this.isReplyPending(reply),
			title: get(t => titleTrim(t.title.rendered), ""),
			shortContent: get(t => shortContent(t.short_content), ""),
			content: get(t => fullContent(t.content.rendered), ""),
			preview: get(t => fullContent(t.preview_data), ""),
			author: memberToViewModel(reply._embedded.user[0]),
			date: get(t => t.date_gmt, ""),
			status: reply.status,
			actionStates: get(t => t.action_states, {spam: false, trash: false}),
			newReply: () =>
				this.props.replyCallbacks.addNewReplyClick(
					reply,
					this.props.currentTopic
				),
			openActionSheet:
				showActions || reply.can_report
					? () => {
							this.setState({currentReply: reply});
							this._onOpenReplyActions(reply);
					  }
					: null,
			openClosedModel: this.openClosedDiscussionModal,
			gif: get(t => t.bbp_media_gif),
			documents: get(t => t.bbp_documents),
			canReply: get(t => t.canReply, false),
			can_report: get(t => t.can_report, false),
			reported: get(t => t.reported, false),
			media,
			videos,
			onMediaClick: (media, number) => {
				this.props.replyCallbacks.onMediaClick(reply, number);
			},
			navigateToProfile: () => {
				this.props.toUserBasedOnSettings(undefined, reply._embedded.user[0]);
			}
		};
	};

	hasPendingReply = () => {
		return (
			this.props.navigation.state.params &&
			this.props.navigation.state.params.replyId !== undefined
		);
	};

	isReplyIdPending = id => (
		this.props.navigation.state.params &&
			this.props.navigation.state.params.replyId !== undefined,
		id === this.props.navigation.state.params.replyId
	);

	isReplyPending = reply => this.isReplyIdPending(reply.id);

	_renderListItem = (reply, config, attemptDeepLink, index) => {
		const {t, auth} = this.props;
		const {global, colors, htmlStyles, htmlStylesCss, tagsStyles} = globalStyle(
			config.styles
		);
		const textColor = colors.textColor;
		const formatDateFunc = formatDate(config.language);

		const viewModel = this._replyToViewModel(reply);
		const mediaStyle = global.mediaItem;
		return (
			<ReplyItem
				key={viewModel.id + viewModel.reported}
				t={t}
				token={auth.token}
				firstItem={index === 0}
				reply={viewModel}
				topicClosed={reply.topicClosedForUser}
				canReply={reply.canReply}
				textColor={textColor}
				formatDateFunc={formatDateFunc}
				global={global}
				colors={colors}
				htmlStylesCss={htmlStylesCss}
				mediaStyle={{
					height: 184,
					width: 143,
					marginRight: 8,
					marginBottom: 2,
					borderRadius: 8
				}}
				navigation={this.props.navigation}
				platform={Platform.OS}
				tagsStyles={tagsStyles}
				attemptDeepLink={attemptDeepLink}
				headerTitleStyle={styles.topicAuthor}
			/>
		);
	};

	_onCancelReplyActions = () => {
		this.setState({showReplyActions: false});
	};

	_onOpenReplyActions = (reply: Reply, showReport: boolean) => {
		const {t} = this.props;

		const userReplyPermissions = reply.current_user_permissions;

		const replyActionsObject = {};
		let replyActionsOrder = [];

		if (userReplyPermissions.edit) {
			replyActionsObject.edit = t("topic:edit");
			replyActionsOrder.push("edit");
		}

		if (userReplyPermissions.move) {
			replyActionsObject.move = t("topic:move");
			replyActionsOrder.push("move");
		}

		if (userReplyPermissions.split) {
			replyActionsObject.split = t("topic:split");
			replyActionsOrder.push("split");
		}

		if (userReplyPermissions.spam && !reply.action_states.trash) {
			replyActionsObject.spam = !reply.action_states.spam
				? t("topic:spam")
				: t("topic:unspam");
			replyActionsOrder.push("spam");
		}

		if (reply.can_report && !reply.reported) {
			replyActionsObject.report = reply?.report_button_text;
			replyActionsOrder.push("report");
		}

		if (userReplyPermissions.trash && !reply.action_states.spam) {
			replyActionsObject.trash = !reply.action_states.trash
				? t("topic:trash")
				: t("topic:restore");
			replyActionsOrder.push("trash");
		}

		this.setState({replyActionsObject, replyActionsOrder});

		requestAnimationFrame(() => {
			this.openReplyMoreOptionsModal();
		});
	};

	_onCancelTopicActions = () => {
		this.setState({showTopicActions: false});
	};

	_onOpenTopicActions = () => {
		this.openMoreOptionsModal();
	};

	openMoreOptionsModal = () => {
		this.moreOptionsModalRef.current?.open();
	};

	closeMoreOptionsModal = () => {
		this.moreOptionsModalRef.current?.close();
	};

	openReplyMoreOptionsModal = () => {
		this.replyMoreOptionsModalRef.current?.open();
	};

	closeReplyMoreOptionsModal = () => {
		this.replyMoreOptionsModalRef.current?.close();
	};

	openClosedDiscussionModal = () =>
		this.closedDiscussionModalRef.current?.open();

	closeClosedDiscussionModal = () =>
		this.closedDiscussionModalRef.current?.close();

	renderTags = (global, tags = "") => (
		<View style={styles.tagsContainer}>
			{tags.split(", ")?.map((tag, index) => (
				<View
					key={`${tag}-${index}`}
					style={[global.topicTag, {marginRight: 6}]}
				>
					<Text style={global.topicTagText}>{tag}</Text>
				</View>
			))}
		</View>
	);

	renderReplyIcon = ({t, colors, global, topic}) => {
		const topicCloseForUser = isUserAdmin(this.props.currentUser)
			? false
			: topic.is_closed;
		return (
			<AppTouchableOpacity
				activeOpacity={topicCloseForUser ? 0.5 : 1}
				style={[global.itemFooter, {opacity: topicCloseForUser ? 0.5 : 1}]}
				onPress={
					topicCloseForUser ? this.openClosedDiscussionModal : topic.newReply
				}
				hitSlop={{top: 10, right: 20, bottom: 20, left: 20}}
			>
				<Icon
					icon={require("../assets/reply.png")}
					webIcon={"IconReply"}
					tintColor={colors.descLightTextColor}
					style={{
						width: 14,
						height: 12
					}}
				/>
				<Text
					style={[global.itemMeta, {marginLeft: 6, color: colors.textColor}]}
				>
					{t("topic:reply")}
				</Text>
			</AppTouchableOpacity>
		);
	};

	renderHeader = attemptDeepLink => {
		const {t, config, settings, currentTopic, navigation} = this.props;
		const {global, colors, tagsStyles} = globalStyle(config.styles);
		const textColor = colors.textColor;
		const linkColor = colors.linkColor;
		const borderColor = colors.borderColor;
		const lightTextColor = colors.descLightTextColor;

		if (!currentTopic) return null;

		const actionButtons = topicActionButtons({topic: currentTopic, settings});
		const topic = this.extendTopicViewModel(currentTopic);
		const formatDateFunc = formatDate(config.language);

		const computedWidth = DEVICE_WIDTH - 32;

		const content = filterContentCss(topic.content);

		return (
			<>
				{currentTopic.is_closed && (
					<ClosedLabel
						t={t}
						global={global}
						colors={colors}
						containerStyle={{marginLeft: GUTTER, alignSelf: "flex-start"}}
					/>
				)}
				<View
					key={hashFunction(topic.content + topic.title)}
					style={[
						styles.headerContainer,
						{
							backgroundColor: colors.bodyFrontBg,
							borderColor: colors.borderColor
						}
					]}
				>
					<View
						style={[
							styles.topicHeader,
							topic.actionStates.spam
								? global.itemSpam
								: {backgroundColor: colors.bodyFrontBg},
							{
								borderBottomColor: borderColor
							}
						]}
					>
						<Text style={[global.topicSingleTitle, {marginBottom: 20}]}>
							{topic.title}
						</Text>

						<View style={styles.itemAltDesc}>
							<ReadMore
								colors={colors}
								content={content}
								size={400}
								t={t}
								global={global}
								style={{marginBottom: 20}}
							>
								{content => (
									<CustomHTML
										source={{html: content}}
										tagsStyles={{
											...tagsStyles,
											iframe: {
												marginTop: 10,
												marginBottom: 10
											}
										}}
										baseStyle={global.textHtml}
										renderersProps={{
											a: {onPress: attemptDeepLink(false)}
										}}
										contentWidth={computedWidth}
										allowedAllTags
										domVisitors={{
											onElement: elementDomTempering(computedWidth)
										}}
										renderers={{
											a: aTagRenderer(computedWidth),
											img: imgRenderer({paddingVertical: 100})
										}}
									/>
								)}
							</ReadMore>
						</View>

						{topic.media?.length > 0 && (
							<View style={{marginBottom: 20}}>
								<ImageCollection
									item={topic}
									containerStyle={{marginTop: 10}}
									colors={colors}
									showActionButtons={false}
									global={global}
									t={t}
								/>
							</View>
						)}

						{topic.videos?.length > 0 && (
							<View style={{marginBottom: 20}}>
								<ImageCollection
									item={topic}
									containerStyle={{marginTop: 10}}
									colors={colors}
									showActionButtons={false}
									global={global}
									t={t}
								/>
							</View>
						)}

						{topic.gif?.preview_url ? (
							<View style={{marginBottom: 20}}>
								<GifVideoPlayer
									url={topic.gif?.video_url}
									poster={topic.gif?.preview_url}
									width={DEVICE_WIDTH * 0.6}
								/>
							</View>
						) : null}

						{topic?.documents?.length > 0 &&
							topic.documents.map(item => {
								const viewModel: DocumentViewModel = documentToViewModel(item);

								return (
									<EmbeddedDocumentItem
										{...{
											t,
											colors,
											global,
											token,
											viewModel,
											navigation
										}}
									/>
								);
							})}

						{topic.topicTags?.length > 0
							? this.renderTags(global, topic.topicTags)
							: null}

						<View style={{flex: 1, marginBottom: 20}}>
							<ItemHeaderComponent
								{...{
									item: topic,
									textColor,
									linkColor,
									global,
									formatDateFunc,
									light: false,
									alignItems: "flex-start",
									avatarSize: 38,
									actionButtons,
									titleStyle: styles.topicAuthor
								}}
							/>
						</View>

						<View style={[global.itemFooter]}>
							<AuthWrapper>
								{this.renderReplyIcon({
									t,
									colors,
									global,
									topic
								})}
							</AuthWrapper>
							<View style={[global.itemFooterMeta, {marginLeft: "auto"}]}>
								<Text style={global.itemMeta}>
									{topic.voiceCount} • {topic.replyCount}
								</Text>
							</View>
						</View>
					</View>
				</View>
			</>
		);
	};

	renderHeaderRight = ({headerColor, ...rest}) => {
		const {config} = this.props;
		const {colors} = globalStyle(config.styles);
		return (
			this.state.topicActionsOrder &&
			this.state.topicActionsOrder.length > 1 && (
				<AuthWrapper>
					<IconButton
						icon={require("../assets/horizontal-dots.png")}
						webIcon={"IconMoreVertical"}
						pressHandler={this._onOpenTopicActions}
						tintColor={headerColor}
						style={{
							width: 20,
							height: 20
						}}
						{...rest}
					/>
				</AuthWrapper>
			)
		);
	};

	_scrollY = new Animated.Value(-NAV_HEIGHT);
	adjustedScroll = Platform.select({
		ios: sub(this._scrollY, -NAV_HEIGHT),
		android: this._scrollY
	});
	_scrollingAnimation = Animated.event([
		{nativeEvent: {contentOffset: {y: this._scrollY}}}
	]);

	renderWithoutReplies = attemptDeepLink => {
		const {t, config, online} = this.props;

		const {global, htmlStyles, htmlStylesCss, colors} = globalStyle(
			config.styles
		);

		return (
			<ScrollView style={global.container}>
				{this.renderHeader(attemptDeepLink)}
				<EmptyList
					global={global}
					emptyText={{
						title: t("empty:repliesNoPermissionsTitle"),
						webIcon: "IconEmptyTopics",
						icon: require("../assets/empty-replies.png"),
						color: colors.borderColor
					}}
					style={{marginBottom: 70}}
					online={online}
				/>
			</ScrollView>
		);
	};

	onEndReached = () => {
		if (this.props.online && this.props.replyListProps.loadMoreBottomAllowed) {
			this.props.replyCallbacks.loadMore(this.props.currentTopic);
		}
	};

	setListRef = component => {
		this.listRef = component;
	};

	renderItem = (config, attemptDeepLink, topic) => ({item, index}) =>
		this._renderListItem(
			{
				...item,
				canReply: topic.canReply,
				topicClosedForUser: isUserAdmin(this.props.currentUser)
					? false
					: topic.is_closed
			},
			config,
			attemptDeepLink,
			index
		);

	onRefresh = () =>
		this.props.replyCallbacks.handleRefresh(this.props.currentTopic);

	renderBottomSheetHeader = ({avatarUri, title, global, onClose, colors}) => (
		<BottomSheetHeader
			global={global}
			onClose={onClose}
			colors={colors}
			renderContent={() => (
				<View style={[global.row, {justifyContent: "space-between", flex: 1}]}>
					{!!avatarUri ? (
						<AppAvatar
							size={40}
							style={styles.bottomSheetHeaderAvatar}
							source={{uri: avatarUri}}
						/>
					) : null}
					<View style={{flex: 1}}>
						<Text style={global.itemTitle} numberOfLines={1}>
							{title}
						</Text>
					</View>
				</View>
			)}
		/>
	);

	renderBottomSheetContent = ({
		global,
		colors,
		data = [],
		onPress,
		textMap,
		paddingBottom
	}) => (
		<View
			style={[
				global.panel,
				{
					paddingHorizontal: GUTTER,
					paddingBottom: paddingBottom
				}
			]}
		>
			<View style={global.roundBox}>
				{data.map((actionName, index) => {
					const textColor =
						actionName === "trash" ? DELETE_ICON_COLOR : colors.textColor;
					return (
						<AppTouchableOpacity
							key={`${actionName}-${index}`}
							onPress={() => onPress({index, actionName})}
							style={[
								global.filterListItem,
								{height: 60},
								index === 0 ? {borderTopWidth: 0} : {}
							]}
						>
							<View
								style={[global.row, {flex: 1, justifyContent: "space-between"}]}
							>
								<View style={global.row}>
									<Icon
										styles={global.optionItemIcon}
										icon={moreOptionsIcons[actionName]}
										tintColor={textColor}
									/>
									<Text style={[global.filterText, {color: textColor}]}>
										{textMap[actionName]}
									</Text>
								</View>
							</View>
						</AppTouchableOpacity>
					);
				})}
			</View>
		</View>
	);

	render() {
		const {t, config, navigation, deepLinkUrls, currentTopic} = this.props;
		const {global, colors} = globalStyle(config.styles);

		const topic = this.extendTopicViewModel(currentTopic);
		const loading = this.props.replyListProps.isBottomLoadingMore;

		const attemptDeepLink = this.props.attemptDeepLink;

		if (!topic.canSeeReplies) {
			return this.renderWithoutReplies(attemptDeepLink);
		}

		const currentReplyAuthorAvatar = this.state.currentReply?._embedded
			?.user?.[0]?.avatar_urls?.thumb;

		return (
			<View style={global.scrollHeaderContainer}>
				<AppList
					ListComponent={AnimatedVirtualizedList}
					innerRef={this.setListRef}
					onScrollToIndexFailed={this.onScrollToIndexFailed}
					global={global}
					loaded={this.props.replyListProps.isLoaded}
					emptyText={{
						title: t("empty:repliesTitle"),
						webIcon: "IconEmptyReplies",
						icon: require("../assets/empty-replies.png"),
						color: colors.borderColor
					}}
					// key={config.hash}
					// id="list"
					loading={loading}
					initialNumToRender={replyPageSize}
					enableEmptySections={true}
					onScroll={this._scrollingAnimation}
					renderItem={this.renderItem(config, attemptDeepLink, topic)}
					data={this.props.replyListProps.replies || []}
					refreshing={this.props.replyListProps.isRefreshing}
					onRefresh={this.onRefresh}
					onEndReached={this.onEndReached}
					ListHeaderComponent={this.renderHeader(attemptDeepLink)}
					onEndReachedThreshold={THRESHOLD}
					headerInList={true}
					contentInset={{top: NAV_HEIGHT}}
					contentOffset={{y: -NAV_HEIGHT}}
					style={{backgroundColor: colors.bodyFrontBg}}
					contentContainerStyle={{
						paddingBottom: correctBottomSafeArea(this.props.insets.bottom)
					}}
				/>

				{/*<AuthNotice
					containerStyle={{
						paddingLeft: 30,
						paddingRight: 20,
						paddingBottom: 30
					}}
					textStyle={global.textSmall}
					text={t("topic:loginToReply")}
				/>*/}
				<TrackPlayerControllerMini />
				<IntercomButton />
				<AnimatedCoverHeader
					y={this.adjustedScroll}
					{...{global, colors, navigation}}
					title={topic.title}
					height={200}
					disableCoverZoom
					renderHeaderRight={this.renderHeaderRight}
				/>

				<PortalScrollableModal
					ref={this.moreOptionsModalRef}
					HeaderComponent={() =>
						this.renderBottomSheetHeader({
							global,
							title: topic.title,
							avatarUri: topic.author?.avatar,
							onClose: this.closeMoreOptionsModal,
							colors
						})
					}
				>
					{this.renderBottomSheetContent({
						global,
						colors,
						data: this.state.topicActionsOrder,
						onPress: ({index}) => {
							this.closeMoreOptionsModal();
							this._triggerTopicAction(this.state.topicActionsOrder[index]);
						},
						textMap: this.state.topicActionsObject,
						paddingBottom: correctBottomSafeArea(this.props.insets.bottom)
					})}
				</PortalScrollableModal>

				<PortalScrollableModal
					ref={this.replyMoreOptionsModalRef}
					HeaderComponent={() =>
						this.renderBottomSheetHeader({
							global,
							title: stripHTMLTags(this.state.currentReply?.content?.raw || ""),
							avatarUri: currentReplyAuthorAvatar,
							onClose: this.closeReplyMoreOptionsModal,
							colors
						})
					}
				>
					{this.renderBottomSheetContent({
						global,
						colors,
						data: this.state.replyActionsOrder,
						onPress: ({actionName}) => {
							this.closeReplyMoreOptionsModal();
							this._triggerReplyAction(actionName, this.state.currentReply);
						},
						textMap: this.state.replyActionsObject,
						paddingBottom: correctBottomSafeArea(this.props.insets.bottom)
					})}
				</PortalScrollableModal>

				<PortalScrollableModal
					ref={this.closedDiscussionModalRef}
					HeaderComponent={() =>
						this.renderBottomSheetHeader({
							global,
							title: this.props.t("forums:discussionClosedTitle"),
							onClose: this.closeClosedDiscussionModal,
							colors
						})
					}
				>
					<View
						style={{
							...global.panel,
							paddingHorizontal: GUTTER,
							paddingBottom: correctBottomSafeArea(this.props.insets.bottom)
						}}
					>
						<View style={global.roundBox}>
							<Text style={[{padding: GUTTER}, global.filterText]}>
								{this.props.t("forums:discussionClosedDescription")}
							</Text>
						</View>
					</View>
				</PortalScrollableModal>
			</View>
		);
	}

	navigateToTopicTagsScreen = tagsParam => {
		this.props.navigation.navigate(
			NavigationActions.navigate({
				routeName: "TopicsTagScreen",
				params: {
					tagsParam
				}
			})
		);
	};

	_triggerTopicAction = action => {
		const originalTopic = this.props.currentTopic;

		switch (action) {
			case "edit":
				this.props.topicCallbacks.editTopic(
					originalTopic,
					this.onActionComplete
				);
				break;
			case "close":
				this.props.topicCallbacks.toggleCloseTopic(originalTopic);
				break;
			case "stick":
				this.props.topicCallbacks.toggleStickTopic(originalTopic);
				break;
			case "superstick":
				this.props.topicCallbacks.superstickTopic(originalTopic);
				break;
			case "merge":
				this.props.topicCallbacks.mergeTopic(
					originalTopic,
					this.onActionComplete
				);
				break;
			case "spam":
				this.props.topicCallbacks.toggleSpamTopic(originalTopic);
				break;
			case "report":
				this.props.navigateToReport("forum_topic")(originalTopic.id);
				break;
			case "trash":
				this.props.topicCallbacks.trashTopic(originalTopic);
				break;
		}
	};

	onActionComplete = (destinationTopic: Topic) => {
		this.setState(
			{
				topic: destinationTopic
			},
			() => {
				this.props.navigation.setParams({
					topic: this.state.topic
				});
			}
		);
	};

	_triggerReplyAction = (action, originalReply) => {
		const originalTopic = this.props.currentTopic;
		const {t} = this.props;

		switch (action) {
			case "edit":
				this.props.replyCallbacks.editReply(
					originalReply,
					this.props.currentTopic
				);
				break;
			case "move":
				this.props.replyCallbacks.moveReply(
					originalReply,
					originalTopic,
					this.onActionComplete,
					t("topic:movePrefix")
				);
				break;
			case "split":
				this.props.replyCallbacks.splitReply(
					originalReply,
					originalTopic,
					this.onActionComplete,
					t("topic:splitPrefix")
				);
				break;
			case "spam":
				this.props.replyCallbacks.toggleSpamReply(originalReply);
				break;
			case "report":
				this.props.navigateToReport("forum_reply")(originalReply.id);
				break;
			case "trash":
				this.props.replyCallbacks.trashReply(originalReply);
				break;
			default:
		}
	};

	_webReplyActionSheet = () => {
		const originalReply = this.state.currentReply;

		return (
			<ActionSheet
				modalVisible={this.state.showReplyActions}
				cancelText={this.props.t("topic:cancel")}
				onCancel={this._onCancelReplyActions}
			>
				{this.state.replyActionsOrder
					.filter(x => x !== "cancel")
					.map((action, index) => (
						<ActionSheet.Button
							key={`${action}-${index}`}
							onPress={() => {
								this._triggerReplyAction(action, originalReply);
								this.setState({showReplyActions: false});
							}}
						>
							{this.state.replyActionsObject[action]}
						</ActionSheet.Button>
					))}
			</ActionSheet>
		);
	};
}

TopicsSingleScreen = withSafeAreaInsets(TopicsSingleScreen);
TopicsSingleScreen.propTypes = {
	config: PropTypes.object.isRequired,
	fonts: PropTypes.object.isRequired,
	navigation: PropTypes.object.isRequired,
	singleTopic: PropTypes.object.isRequired,
	// replies: PropTypes.object.isRequired,
	topicCallbacks: PropTypes.object.isRequired,
	replyCallbacks: PropTypes.object.isRequired
};

const mapStateToProps = (state, ownProps) => {
	const isRefreshing = [
		state.singleTopic.topLoadingState,
		state.singleTopic.bottomLoadingState
	].includes("refreshing");

	const isLoaded = state.singleTopic.lastLoadedReplyPage !== 0;
	const isBottomLoadingMore =
		state.singleTopic.bottomLoadingState === "loading";

	const isTopLoadingMore = state.singleTopic.topLoadingState === "loading";

	const replies = getReplies(state);

	const replyListProps = {
		isRefreshing,
		isBottomLoadingMore,
		isTopLoadingMore,
		isLoaded,
		replies,
		loadMoreBottomAllowed: isLoadingAllowed(state.singleTopic, "bottom"),
		loadMoreTopAllowed: isLoadingAllowed(state.singleTopic, "top")
	};

	const topic = ownProps.topic || ownProps.navigation.state.params.topic;

	return {
		currentUser: state.user.userObject,
		settings: getPlatformSettings(state),
		replyListProps,
		config: state.config,
		auth: state.auth,
		fonts: state.fonts,
		singleTopic: state.singleTopic,
		currentTopic: state.topicCache.byId.get(topic.id.toString()) || topic,
		referer: getReferer(),
		deepLinkUrls: state.urls.byUrl,
		online: state.network.online
	};
};

import type {Topic} from "@src/services/types/topics";
import type {Reply} from "@src/services/types/replies";
import type {Forum} from "@src/services/types/forums";
import AppAlert from "@src/components/AppAlert";
import {List} from "immutable";
import {getPlatformSettings, hashFunction} from "@src/reducers/config";
import {getReplies, isLoadingAllowed} from "@src/reducers/singleTopic";
import ListButton from "@src/components/ListButton";
import EmptyList from "@src/components/EmptyList";
import {navigateToProfile} from "@src/actions/userProfile";
import {transformBlocks} from "@src/epics/blockData";
import {topicActionButtons} from "@src/components/ActionButtons";
import {navigateToAddTopic} from "@src/actions/topics";
import AnimatedVirtualizedList from "@src/components/AnimatedVirtualizedList";
import AnimatedListHeader from "@src/components/AnimatedListHeader";
import {GifVideoPlayer} from "@src/components/Gif";
import AnimatedCoverHeader from "@src/components/AnimatedCoverHeader";
import {getReferer} from "@src/utils/buildConfigUtils";
import {withSafeAreaInsets} from "react-native-safe-area-context";
import withDeeplinkClickHandler from "@src/components/hocs/withDeeplinkClickHandler";
import reactotron from "reactotron-react-native";
import {ClosedLabel} from "@src/components/utils";
import {isUserAdmin} from "@src/utils/userPermissions";
import CustomHTML from "@src/components/HTML";

function mapDispatchToProps(dispatch, ownProps) {
	let singleTopicActions = bindActionCreators(SingleTopicActions, dispatch);
	let topicActions = bindActionCreators(TopicsAction, dispatch);

	const setReplyId = reply => {
		ownProps.navigation.setParams({replyId: reply.id});
	};

	const replyChange = args => {
		ownProps.navigation.dispatch(
			NavigationActions.navigate({
				routeName: "NewReplyScreen",
				params: args
			})
		);
	};

	const addNewReplyClick = (reply: Reply, topic: Topic): void => {
		replyChange({topic, reply, onActionComplete: setReplyId});
	};

	const addNewReplyTopicClick = (topic: Topic): void => {
		replyChange({topic, onActionComplete: setReplyId});
	};

	const editReply = (reply: Reply, topic: Topic): void => {
		replyChange({topic, reply, edit: true, onActionComplete: setReplyId});
	};

	const subscribeTopicClick = (topic: Topic): void => {
		if (topic.action_states.subscribed) {
			topicActions.unsubscribeTopic(topic);
		} else {
			topicActions.subscribeTopic(topic);
		}
	};

	const favouriteTopicClick = (topic: Topic): void => {
		if (topic.action_states.favorited) {
			singleTopicActions.unfavouriteTopic(topic);
		} else {
			singleTopicActions.favouriteTopic(topic);
		}
	};

	const editTopic = (topic: Topic, onActionComplete: Topic => void): void =>
		dispatch(
			navigateToAddTopic(topic.id, topic.forum_id, onActionComplete, "edit")
		);

	const toggleCloseTopic = (topic: Topic): void => {
		if (topic.action_states.open) {
			singleTopicActions.closeTopic(topic);
		} else {
			singleTopicActions.openTopic(topic);
		}
	};

	const toggleStickTopic = (topic: Topic): void => {
		if (topic.action_states.sticky) {
			singleTopicActions.unstickTopic(topic);
		} else {
			singleTopicActions.stickTopic(topic);
		}
	};

	const superstickTopic = (topic: Topic): void => {
		singleTopicActions.superstickTopic(topic);
	};

	const mergeTopic = (topic: Topic, onActionComplete: Topic => void): void => {
		ownProps.navigation.dispatch(
			NavigationActions.navigate({
				routeName: "MergeTopicScreen",
				params: {
					topic: topic,
					from: ownProps.navigation.state.params.from,
					onActionComplete
				}
			})
		);
	};

	const toggleSpamTopic = (topic: Topic): void => {
		if (topic.action_states.spam) {
			singleTopicActions.unspamTopic(topic);
		} else {
			singleTopicActions.spamTopic(topic);
			// ownProps.navigation.dispatch(
			//     NavigationActions.navigate({
			//         routeName: 'TopicsScreen'
			//     })
			// );
		}
	};

	const trashTopic = (topic: Topic): void => {
		singleTopicActions.trashTopic(topic);
	};

	const handleRefresh = currentTopic => {
		singleTopicActions.replyRefresh(currentTopic);
	};

	const loadMore = (currentTopic, direction = "bottom") => {
		singleTopicActions.repliesRequested(currentTopic, direction);
	};

	const loadFirst = currentTopic => {
		singleTopicActions.repliesRequested(currentTopic);
	};

	const loadPendingReplyPage = currentTopic => {
		const {
			navigation: {
				state: {
					params: {replyId}
				}
			}
		} = ownProps;
		singleTopicActions.repliesRequestedWithPendingReply(currentTopic, replyId);
	};

	const moveReply = (
		reply: Reply,
		topic: Topic,
		onActionComplete: Topic => void,
		prefix
	): void => {
		ownProps.navigation.dispatch(
			NavigationActions.navigate({
				routeName: "MoveReplyScreen",
				params: {
					topic: topic,
					reply,
					prefix,
					from: ownProps.navigation.state.params.from,
					onActionComplete
				}
			})
		);
	};

	const splitReply = (
		reply: Reply,
		topic: Topic,
		onActionComplete: Topic => void,
		prefix
	): void => {
		ownProps.navigation.dispatch(
			NavigationActions.navigate({
				routeName: "SplitReplyScreen",
				params: {
					topic: topic,
					reply,
					prefix,
					from: ownProps.navigation.state.params.from,
					onActionComplete
				}
			})
		);
	};

	const toggleSpamReply = (reply: Reply): void => {
		if (reply.action_states.spam) {
			singleTopicActions.unspamReply(reply);
		} else {
			singleTopicActions.spamReply(reply);
		}
	};

	const trashReply = (reply: Reply): void => {
		singleTopicActions.trashReply(reply);
	};

	const onMediaClick = (item, mediaNumber = 0) => {
		ownProps.navigation.dispatch(
			NavigationActions.navigate({
				routeName: "BBMediaFullView",
				params: {
					bbMedia: item.bbp_media.map(media => ({
						...media,
						url: media.full || media.thumb
					})),
					currentIndex: mediaNumber || 0
				}
			})
		);
	};

	let replyCallbacks = {
		addNewReplyClick,
		addNewReplyTopicClick,
		loadMore,
		handleRefresh,
		loadFirst,
		editReply,
		moveReply,
		splitReply,
		toggleSpamReply,
		trashReply,
		onMediaClick,
		loadPendingReplyPage
	};

	const toUserBasedOnSettings = (
		selectedTabId?: string,
		user?: User,
		params: any
	) =>
		dispatch(
			navigateToProfile(ownProps.navigation, selectedTabId, user, params)
		);

	let topicCallbacks = {
		subscribeTopicClick,
		favouriteTopicClick,
		editTopic,
		toggleCloseTopic,
		toggleStickTopic,
		superstickTopic,
		mergeTopic,
		toggleSpamTopic,
		trashTopic,
		onMediaClick
	};

	let onExit = singleTopicActions.repliesExit;

	let lifeCycle = {
		onStart: args => {
			singleTopicActions.singleTopicStarted(args);
			const nativeContent = concatNativeContent(
				args?.topic?.content_native || []
			);
			dispatch(
				bulkRecourcesByUrlRequest(
					nativeContent !== "" ? nativeContent : args?.topic?.content?.raw || ""
				)
			);
		},
		onStop: singleTopicActions.singleTopicStopped
	};

	return {
		toUserBasedOnSettings,
		topicCallbacks,
		replyCallbacks,
		onExit,
		lifeCycle,
		actions: bindActionCreators(
			{
				mediaUpdateRequest
			},
			dispatch
		)
	};
}

const merge = (stateProps, dispatchProps, ownProps) => {
	return Object.assign({}, ownProps, stateProps, dispatchProps);
};

const TopicsSingleScreenEnh = compose(
	withProfileNavigation,
	withTranslation("topic"),
	withReportModal,
	connect(
		mapStateToProps,
		mapDispatchToProps,
		merge
	),
	withDeeplinkClickHandler
)(TopicsSingleScreen);
TopicsSingleScreenEnh.navigationOptions = {header: null};
export default TopicsSingleScreenEnh;

const styles = StyleSheet.create({
	headerContainer: {
		paddingVertical: 20,
		paddingHorizontal: GUTTER,
		borderBottomWidth: StyleSheet.hairlineWidth
	},
	wrapper: {
		flex: 1,
		position: "relative",
		zIndex: 1
	},
	topicHeader: {
		position: "relative",
		zIndex: 1
	},
	itemAltDesc: {
		marginTop: -4
	},
	listWrap: {
		flex: 1
	},
	separator: {
		marginLeft: 52,
		height: StyleSheet.hairlineWidth
	},
	bottomSheetHeaderAvatar: {
		height: 40,
		width: 40,
		borderRadius: 20,
		marginRight: 12
	},
	tagsContainer: {
		flexWrap: "wrap",
		flexDirection: "row",
		marginBottom: 20
	},
	topicAuthor: {
		fontSize: 15,
		fontWeight: FontWeights.semiBold,
		marginBottom: 4
	},
	replyButton: {
		paddingTop: 10,
		paddingRight: 10
	}
});
