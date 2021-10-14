// @flow

import {Alert} from "react-native";
import type {IOMiddlewareOptions} from "@src/configureStore";

const {ActionTypes} = require("@src/actions/ActionTypes");
const {
	signupExit,
	signupSuccess,
	signupFailure,
	signupInProcess
} = require("@src/actions/singup");
import {Rx} from "rxjs";
import {Observable} from "rxjs/Observable";
import {Observer} from "rxjs/Observer";
import {asObservable} from "@src/epics/rxUtils";
import {errorToAction} from "@src/utils";
const {getApi} = require("@src/services");
const {
	objectValidation,
	arrayOfObjectsValidation,
	arrayValidation
} = require("@src/services/validation");

import type {RegisterParams, User} from "@src/services/api";
import {isPlatformDisabled} from "@src/utils";
import {isCodeVerificationEnabled} from "@src/reducers/settings";

export function signup(
	action: Observable<Object>,
	store: Object,
	dependencies: IOMiddlewareOptions
): Observable<Object> {
	return action
		.filter(
			a =>
				a.type === ActionTypes.SIGNUP_REQUESTED ||
				(a.type === ActionTypes.PURCHASE_SUCCESS && a.withSignup === true)
		)
		.mergeMap(r => {
			const state = store.getState();
			const {config, network, signup, settings} = state;
			const {navigationService, t} = dependencies;
			const isWithPurchase = r.type !== ActionTypes.SIGNUP_REQUESTED;
			const isVerificationEnabled = isCodeVerificationEnabled(state) === true;
			const isPlfDisabled = isPlatformDisabled(settings.settings);
			const isbbRegistration = isVerificationEnabled && isPlfDisabled === false;

			if (!network.online) {
				return Observable.from(
					Promise.resolve(() => {
						Alert.alert("No Connection", "Kindly go online to sign up.");
					})
				);
			}

			const api = getApi(config);

			let registerData: ?RegisterParams = null;

			if (!isWithPurchase) {
				registerData = r.data;
			} else {
				const formData = signup.signupData;
				formData.append("iap_order_id", r.purchase.order_id);
				registerData = formData;
			}
			let signupRequestObservable = Observable.of(signupInProcess());

			// api.register(registerData, config.app_id, config.app_version)
			let requestObservable = asObservable(
				api.customRequest(
					"wp-json/buddyboss-app/v1/signup",
					"post",
					registerData,
					objectValidation,
					{
						"Content-Type": "multipart/form-data",
						appid: config.app_id,
						appversion: config.app_version
					}
				)
			)
				.do(response => {
					if (
						isWithPurchase &&
						response?.data?.code !== "bp_rest_register_errors"
					) {
						const user = response.data;

						Alert.alert(
							t(`signup:successModalTitle${isbbRegistration ? "" : "WP"}`),
							t(`signup:successModalText${isbbRegistration ? "" : "WP"}`),
							[
								{
									text: t("signup:successModalOk"),
									onPress: () => {
										if (isbbRegistration) {
											navigationService.navigate({
												routeName: "CodeVerificationScreen",
												params: {
													code: "",
													email: isPlfDisabled
														? user.email
														: user.data.user_email
												}
											});
										} else {
											navigationService.navigate({routeName: "LoginScreen"});
										}
									}
								}
							]
						);
					}
				})
				.map(response => {
					if (response.data.code === "bp_rest_register_errors") {
						const errorMessage = response.data.message;
						if (typeof errorMessage === "object") {
							return signupFailure(
								"\n" + Object.values(errorMessage).join("\n\n")
							);
						}
						throw new Error();
					} else {
						return signupSuccess(response);
					}
				})
				.catch(ex => Observable.of(errorToAction(ex, e => signupFailure(e))));
			let cancelRequestObservable = action
				.filter(action => {
					return (
						action.type === ActionTypes.SIGNUP_EXIT ||
						action.type === "LOGIN" ||
						action.type.startsWith("Navigation")
					);
				})
				.map(r => signupExit())
				.take(1);
			return Observable.merge(
				signupRequestObservable,
				requestObservable.race(cancelRequestObservable)
			);
		});
}
