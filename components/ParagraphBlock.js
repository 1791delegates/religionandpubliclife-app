import HTML from "react-native-render-html";
import {View} from "react-native";
import React, {Component} from "react";
import PropTypes from "prop-types";
import {cleanBlockStyle} from "@src/components/Blocks/utils";
import AppImage from "@src/components/AppImage";

export default class ParagraphBlock extends Component {
	shouldComponentUpdate(nextProps) {
		return nextProps.block !== this.props.block;
	}

	renderItem = (item, index, blockStyle) => {
		const {
			block,
			global,
			calcFontSize,
			htmlHandleClicks,
			fontFamilyStyle,
			containerStyle
		} = this.props;

		const textColor = block.style?.parent_style?.textColor;
		const fontSize = blockStyle.fontSize
			? calcFontSize(blockStyle.fontSize)
			: global.textHtml.fontSize;

		switch (item.type) {
			case "a":
			case "text":
				const style = {
					...global.content,
					...blockStyle,
					...fontFamilyStyle,
					...(textColor ? {color: textColor} : {}),
					textAlign: blockStyle.textAlign || blockStyle.align,
					fontSize: fontSize,
					backgroundColor: "transparent"
				};
				return (
					<HTML
						key={index}
						html={item.data ? `${item.data}` : " "}
						containerStyle={containerStyle}
						baseFontStyle={style}
						tagsStyles={{
							a: {
								...global.linkContent,
								...blockStyle,
								fontSize: fontSize,
								...fontFamilyStyle
							}
						}}
						onLinkPress={htmlHandleClicks}
					/>
				);

			case "image":
				const ratio = block.style.height / block.style.width;
				return (
					<AppImage
						key={index}
						source={{uri: item.src}}
						resizeMode={"contain"}
						style={{width: 150, height: 150 * ratio, marginRight: 5}}
					/>
				);

			default:
				return item.data ? (
					<HTML
						key={index}
						html={item.data}
						containerStyle={containerStyle}
						tagsStyles={{
							a: {
								...global.linkContent,
								...blockStyle,
								...fontFamilyStyle,
								fontSize: fontSize
							}
						}}
					/>
				) : null;
		}
	};

	render() {
		const {block, wrapStyle = {}} = this.props;

		const blockStyle = block.style ? cleanBlockStyle(block.style) : {};
		return (
			<View
				style={[
					{
						flex: 1,
						flexWrap: "wrap",
						flexDirection: "row",
						backgroundColor: blockStyle.backgroundColor,
						marginHorizontal: 15
					},
					blockStyle.backgroundColor && {
						paddingHorizontal: 15
					},
					wrapStyle
				]}
			>
				{block.content.map((item, index) =>
					this.renderItem(item, index, blockStyle)
				)}
			</View>
		);
	}
}

ParagraphBlock.defaultProps = {
	containerStyle: {
		flex: 1
	}
};

ParagraphBlock.propTypes = {
	block: PropTypes.object.isRequired,
	fontFamily: PropTypes.string
};
