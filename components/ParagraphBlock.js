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

	render() {
		const {
			block,
			global,
			calcFontSize,
			htmlHandleClicks,
			fontFamilyStyle,
			viewWidth,
			wrapStyle = {}
		} = this.props;

		const blockStyle = block.style ? cleanBlockStyle(block.style) : {};
		const textColor = block.style?.parent_style?.textColor;
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
				{block.content.map((item, contentIndex) => {
					if (item.type === "text") {
						const style = {
							...global.content,
							...blockStyle,
							...fontFamilyStyle,
							...(textColor ? {color: textColor} : {}),
							textAlign: blockStyle.textAlign || blockStyle.align,
							fontSize: blockStyle.fontSize
								? calcFontSize(blockStyle.fontSize)
								: global.textHtml.fontSize,
							backgroundColor: "transparent"
						};

						return (
							<HTML
								key={contentIndex}
								html={item.data ? `${item.data}` : " "}
								containerStyle={{flex: 1}}
								baseFontStyle={style}
								tagsStyles={{
									a: {
										...global.linkContent,
										...blockStyle,
										...fontFamilyStyle,
										fontSize: blockStyle.fontSize
											? calcFontSize(blockStyle.fontSize)
											: global.textHtml.fontSize
									}
								}}
								onLinkPress={htmlHandleClicks}
							/>
						);
					} else if (item.type === "image") {
						const ratio = block.style.height / block.style.width;
						return (
							<AppImage
								key={contentIndex}
								source={{uri: item.src}}
								resizeMode={"contain"}
								style={{width: 150, height: 150 * ratio, marginRight: 5}}
							/>
						);
					} else {
						return null;
					}
				})}
			</View>
		);
	}
}

ParagraphBlock.propTypes = {
	block: PropTypes.object.isRequired,
	fontFamily: PropTypes.string
};
